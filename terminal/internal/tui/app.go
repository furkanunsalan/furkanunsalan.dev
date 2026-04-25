package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/lipgloss"

	"github.com/furkanunsalan/furkanunsalan.dev/terminal/internal/data"
)

type route int

const (
	routeHome route = iota
	routeExperience
	routeProjects
	routeWriting
	routeBookmarks
	routeTools
)

var navItems = []struct {
	key   string
	label string
	route route
}{
	{"1", "home", routeHome},
	{"2", "experience", routeExperience},
	{"3", "projects", routeProjects},
	{"4", "writing", routeWriting},
	{"5", "bookmarks", routeBookmarks},
	{"6", "tools", routeTools},
}

// ----- Messages from background loaders ------------------------------------

type reposMsg struct {
	repos []data.Repo
	err   error
}
type bookmarksMsg struct {
	items []data.Bookmark
	err   error
}

// ----- Model ---------------------------------------------------------------

type Model struct {
	width, height int
	current       route
	cursor        int
	openSlug      string
	posts         []data.Post
	experiences   []data.Experience
	tools         []data.Tool
	repos         []data.Repo
	bookmarks     []data.Bookmark
	loadErr       error
	reposErr      error
	bookmarksErr  error
	vp            viewport.Model
	ready         bool
}

func New() Model {
	posts, errP := data.LoadPosts()
	exps, errE := data.LoadExperiences()
	tools, errT := data.LoadTools()
	var firstErr error
	for _, e := range []error{errP, errE, errT} {
		if e != nil && firstErr == nil {
			firstErr = e
		}
	}
	return Model{
		current:     routeHome,
		posts:       posts,
		experiences: exps,
		tools:       tools,
		loadErr:     firstErr,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(fetchRepos(), fetchBookmarks())
}

func fetchRepos() tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		repos, err := data.LoadRepos(ctx)
		return reposMsg{repos: repos, err: err}
	}
}

func fetchBookmarks() tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		items, err := data.LoadBookmarks(ctx, 30)
		return bookmarksMsg{items: items, err: err}
	}
}

// ----- Update --------------------------------------------------------------

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		bodyW := msg.Width - sidebarWidth - 4
		if bodyW < 20 {
			bodyW = 20
		}
		bodyH := msg.Height - 4
		if bodyH < 4 {
			bodyH = 4
		}
		if !m.ready {
			m.vp = viewport.New(bodyW, bodyH)
			m.vp.MouseWheelEnabled = true
			m.ready = true
		} else {
			m.vp.Width = bodyW
			m.vp.Height = bodyH
		}
		m.vp.SetContent(m.renderBody())
		return m, nil

	case reposMsg:
		m.repos, m.reposErr = msg.repos, msg.err
		if m.current == routeProjects {
			m.vp.SetContent(m.renderBody())
		}
		return m, nil

	case bookmarksMsg:
		m.bookmarks, m.bookmarksErr = msg.items, msg.err
		if m.current == routeBookmarks {
			m.vp.SetContent(m.renderBody())
		}
		return m, nil

	case tea.KeyMsg:
		key := msg.String()

		// Global quit
		if key == "q" || key == "ctrl+c" {
			return m, tea.Quit
		}

		// Numeric jumps work everywhere except when typing into a list
		// (we don't have any). Always allow.
		for _, n := range navItems {
			if key == n.key {
				m.current = n.route
				m.cursor = 0
				m.openSlug = ""
				m.vp.SetContent(m.renderBody())
				m.vp.GotoTop()
				return m, nil
			}
		}

		// Inside post detail: esc/backspace returns to list, everything else scrolls
		if m.current == routeWriting && m.openSlug != "" {
			switch key {
			case "esc", "backspace":
				m.openSlug = ""
				m.vp.SetContent(m.renderBody())
				m.vp.GotoTop()
				return m, nil
			}
			var c tea.Cmd
			m.vp, c = m.vp.Update(msg)
			cmds = append(cmds, c)
			return m, tea.Batch(cmds...)
		}

		// Writing list: cursor + open
		if m.current == routeWriting {
			switch key {
			case "j", "down":
				m.cursor = clamp(m.cursor+1, 0, len(m.posts)-1)
				m.vp.SetContent(m.renderBody())
				return m, nil
			case "k", "up":
				m.cursor = clamp(m.cursor-1, 0, len(m.posts)-1)
				m.vp.SetContent(m.renderBody())
				return m, nil
			case "g", "home":
				m.cursor = 0
				m.vp.SetContent(m.renderBody())
				m.vp.GotoTop()
				return m, nil
			case "G", "end":
				m.cursor = len(m.posts) - 1
				m.vp.SetContent(m.renderBody())
				m.vp.GotoBottom()
				return m, nil
			case "enter", "l", "right":
				if len(m.posts) > 0 {
					m.openSlug = m.posts[m.cursor].Slug
					m.vp.SetContent(m.renderBody())
					m.vp.GotoTop()
				}
				return m, nil
			}
		}

		// All other views: forward to viewport (handles up/down/pgup/pgdn/home/end/k/j)
		var c tea.Cmd
		m.vp, c = m.vp.Update(msg)
		cmds = append(cmds, c)
		return m, tea.Batch(cmds...)

	case tea.MouseMsg:
		var c tea.Cmd
		m.vp, c = m.vp.Update(msg)
		cmds = append(cmds, c)
		return m, tea.Batch(cmds...)
	}

	return m, tea.Batch(cmds...)
}

// ----- View ----------------------------------------------------------------

const sidebarWidth = 18

func (m Model) View() string {
	if !m.ready {
		return "loading..."
	}
	row := lipgloss.JoinHorizontal(
		lipgloss.Top,
		Sidebar.Render(m.renderSidebar()),
		Border.Render(m.vp.View()),
	)
	return lipgloss.JoinVertical(
		lipgloss.Left,
		Banner.Render("furkanunsalan.dev — ssh terminal"),
		row,
		Help.Render(m.renderHelp()),
	)
}

func (m Model) renderSidebar() string {
	var b strings.Builder
	for _, n := range navItems {
		marker := "  "
		style := Item
		if n.route == m.current {
			marker = "▸ "
			style = Selected
		}
		b.WriteString(style.Render(fmt.Sprintf("%s%s %s", marker, Mono.Render("["+n.key+"]"), n.label)))
		b.WriteString("\n")
	}
	return b.String()
}

// ----- Body renderers ------------------------------------------------------

func (m Model) renderBody() string {
	if m.loadErr != nil {
		return Dim.Render("content load error: " + m.loadErr.Error())
	}
	switch m.current {
	case routeHome:
		return m.renderHome()
	case routeExperience:
		return m.renderExperience()
	case routeProjects:
		return m.renderProjects()
	case routeWriting:
		if m.openSlug != "" {
			return m.renderPostDetail()
		}
		return m.renderWritingList()
	case routeBookmarks:
		return m.renderBookmarks()
	case routeTools:
		return m.renderTools()
	}
	return ""
}

func (m Model) renderHome() string {
	var b strings.Builder
	b.WriteString(Title.Render("Furkan Ünsalan") + "\n")
	b.WriteString(Mono.Render("Software engineer · Istanbul, TR") + "\n\n")
	b.WriteString(`Dedicated software engineering student with a focus on full-stack web
development and special love for communities. Enthusiastic about creating
and contributing to open-source projects while continually exploring and
learning new technologies.` + "\n\n")
	b.WriteString(Header.Render("Find me") + "\n")
	b.WriteString(Item.Render("github   ") + Mono.Render("https://github.com/furkanunsalan") + "\n")
	b.WriteString(Item.Render("linkedin ") + Mono.Render("https://linkedin.com/in/furkanunsalan") + "\n")
	b.WriteString(Item.Render("mail     ") + Mono.Render("hi@furkanunsalan.dev") + "\n")
	b.WriteString(Item.Render("web      ") + Mono.Render("https://furkanunsalan.dev") + "\n")
	return b.String()
}

func (m Model) renderExperience() string {
	if len(m.experiences) == 0 {
		return Dim.Render("no experiences loaded")
	}
	var b strings.Builder
	currentOrg := ""
	for _, x := range m.experiences {
		if x.Organization != currentOrg {
			if currentOrg != "" {
				b.WriteString("\n")
			}
			b.WriteString(Header.Render(x.Organization) + "\n")
			currentOrg = x.Organization
		}
		end := "Present"
		if x.EndDate != nil && *x.EndDate != "" {
			end = *x.EndDate
		}
		b.WriteString(Tag.Render(x.Title) + Mono.Render(fmt.Sprintf("  %s → %s", x.StartDate, end)) + "\n")
		for _, line := range strings.Split(x.Comment, "\n") {
			if line == "" {
				b.WriteString("\n")
				continue
			}
			b.WriteString(Item.Render("  "+line) + "\n")
		}
		for _, l := range x.Links {
			b.WriteString(Mono.Render("  → ") + Tag.Render(l.Label) + Mono.Render("  "+l.URL) + "\n")
		}
		b.WriteString("\n")
	}
	return b.String()
}

func (m Model) renderProjects() string {
	if m.reposErr != nil {
		return Dim.Render("github fetch failed: " + m.reposErr.Error())
	}
	if len(m.repos) == 0 {
		return Dim.Render("loading repos...")
	}
	var b strings.Builder
	for _, r := range m.repos {
		b.WriteString(Tag.Render(fmt.Sprintf("★ %d", r.Stars)) + "  " + Item.Render(r.Name) + "\n")
		if r.Description != "" {
			b.WriteString(Dim.Render("    "+r.Description) + "\n")
		}
		extra := ""
		if r.Language != "" {
			extra += r.Language + "  ·  "
		}
		extra += r.HTMLURL
		b.WriteString(Mono.Render("    "+extra) + "\n\n")
	}
	return b.String()
}

func (m Model) renderWritingList() string {
	if len(m.posts) == 0 {
		return Dim.Render("no posts found")
	}
	var b strings.Builder
	for i, p := range m.posts {
		marker := "  "
		style := Item
		if i == m.cursor {
			marker = "▸ "
			style = Selected
		}
		b.WriteString(style.Render(marker+p.Title) + "  " + Mono.Render(p.Date) + "\n")
	}
	return b.String()
}

func (m Model) renderPostDetail() string {
	var post *data.Post
	for i := range m.posts {
		if m.posts[i].Slug == m.openSlug {
			post = &m.posts[i]
			break
		}
	}
	if post == nil {
		return Dim.Render("post not found")
	}
	width := m.vp.Width
	if width < 40 {
		width = 40
	}
	r, err := glamour.NewTermRenderer(
		glamour.WithStandardStyle("dark"),
		glamour.WithWordWrap(width-2),
	)
	if err != nil {
		return Dim.Render("renderer error: " + err.Error())
	}
	rendered, err := r.Render(post.Body)
	if err != nil {
		return Dim.Render("render error: " + err.Error())
	}
	header := Title.Render(post.Title) + "\n" + Mono.Render(post.Date) + "\n\n"
	return header + rendered
}

func (m Model) renderBookmarks() string {
	if m.bookmarksErr != nil {
		return Dim.Render("raindrop fetch failed: " + m.bookmarksErr.Error())
	}
	if len(m.bookmarks) == 0 {
		return Dim.Render("loading bookmarks...")
	}
	var b strings.Builder
	for _, bm := range m.bookmarks {
		b.WriteString(Item.Render("• "+bm.Title) + "\n")
		b.WriteString(Mono.Render("  "+bm.Link) + "\n")
		if bm.Created != "" {
			b.WriteString(Dim.Render("  "+bm.Created[:10]) + "\n")
		}
		b.WriteString("\n")
	}
	return b.String()
}

func (m Model) renderTools() string {
	if len(m.tools) == 0 {
		return Dim.Render("no tools loaded")
	}
	groups := map[string][]data.Tool{}
	order := []string{"tech", "desk", "other"}
	for _, t := range m.tools {
		groups[t.Category] = append(groups[t.Category], t)
	}
	var b strings.Builder
	for _, cat := range order {
		items := groups[cat]
		if len(items) == 0 {
			continue
		}
		b.WriteString(Header.Render(strings.ToUpper(cat)) + "\n")
		for _, t := range items {
			fav := "  "
			if t.Favorite {
				fav = "❤ "
			}
			label := fmt.Sprintf("%s%s %s", fav, t.Brand, t.Name)
			b.WriteString(Item.Render(label) + "  " + Mono.Render("["+t.What+"]") + "\n")
			if t.Comment != "" {
				b.WriteString(Dim.Render("    "+t.Comment) + "\n")
			}
		}
		b.WriteString("\n")
	}
	return b.String()
}

func (m Model) renderHelp() string {
	if m.current == routeWriting && m.openSlug != "" {
		return Dim.Render("scroll: ↑/↓/k/j · pgup/pgdn · mouse  •  esc back  •  q quit")
	}
	if m.current == routeWriting {
		return Dim.Render("↑/↓/k/j move · enter open · 1-6 sections · q quit")
	}
	return Dim.Render("scroll: ↑/↓/k/j · pgup/pgdn · mouse  •  1-6 sections  •  q quit")
}

func clamp(v, lo, hi int) int {
	if hi < lo {
		return lo
	}
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
