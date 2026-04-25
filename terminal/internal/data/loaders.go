package data

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Post struct {
	Slug    string
	Title   string
	Date    string
	Tags    []string
	Body    string
}

type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Experience struct {
	ID           string   `json:"id"`
	Order        int      `json:"order"`
	Organization string   `json:"organization"`
	Title        string   `json:"title"`
	StartDate    string   `json:"startDate"`
	EndDate      *string  `json:"endDate"`
	Comment      string   `json:"comment"`
	Links        []Link   `json:"links"`
	Images       []string `json:"images"`
}

type Tool struct {
	Name     string  `json:"name"`
	Brand    string  `json:"brand"`
	What     string  `json:"what"`
	Category string  `json:"category"`
	Comment  string  `json:"comment"`
	Favorite bool    `json:"favorite"`
	Link     *string `json:"link"`
}

// Root is the absolute path to the project root containing the content/ folder.
var Root string

func init() {
	if r := os.Getenv("CONTENT_ROOT"); r != "" {
		Root = r
		return
	}
	Root = "."
}

func contentPath(parts ...string) string {
	return filepath.Join(append([]string{Root, "content"}, parts...)...)
}

// ----- Posts ---------------------------------------------------------------

func LoadPosts() ([]Post, error) {
	dir := contentPath("posts")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var posts []Post
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		slug := e.Name()
		raw, err := os.ReadFile(filepath.Join(dir, slug, "index.mdoc"))
		if err != nil {
			if errIs(err, fs.ErrNotExist) {
				continue
			}
			return nil, err
		}
		fm, body := splitFrontmatter(string(raw))
		posts = append(posts, Post{
			Slug:  slug,
			Title: fm["title"],
			Date:  fm["date"],
			Tags:  parseList(fm["tags"]),
			Body:  body,
		})
	}

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})
	return posts, nil
}

// ----- Experiences ---------------------------------------------------------

func LoadExperiences() ([]Experience, error) {
	dir := contentPath("experiences")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var out []Experience
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, e.Name(), "index.json"))
		if err != nil {
			if errIs(err, fs.ErrNotExist) {
				continue
			}
			return nil, err
		}
		var x Experience
		if err := json.Unmarshal(raw, &x); err != nil {
			return nil, fmt.Errorf("%s: %w", e.Name(), err)
		}
		out = append(out, x)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Order != out[j].Order {
			return out[i].Order < out[j].Order
		}
		return out[i].StartDate > out[j].StartDate
	})
	return out, nil
}

// ----- Tools ---------------------------------------------------------------

func LoadTools() ([]Tool, error) {
	dir := contentPath("tools")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var out []Tool
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, e.Name(), "index.json"))
		if err != nil {
			if errIs(err, fs.ErrNotExist) {
				continue
			}
			return nil, err
		}
		var t Tool
		if err := json.Unmarshal(raw, &t); err != nil {
			return nil, fmt.Errorf("%s: %w", e.Name(), err)
		}
		out = append(out, t)
	}
	return out, nil
}

// ----- Frontmatter helpers -------------------------------------------------

// splitFrontmatter parses simple `key: value` YAML frontmatter between `---`
// markers, plus a `tags:\n  - x\n  - y` list. It is intentionally tiny — a
// real YAML parser is overkill for the schema Keystatic produces.
func splitFrontmatter(s string) (map[string]string, string) {
	out := map[string]string{}
	if !strings.HasPrefix(s, "---") {
		return out, s
	}
	rest := strings.TrimPrefix(s, "---\n")
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return out, s
	}
	header := rest[:end]
	body := strings.TrimPrefix(rest[end+4:], "\n")

	var currentList string
	var listVals []string
	for _, line := range strings.Split(header, "\n") {
		if strings.HasPrefix(line, "  - ") {
			listVals = append(listVals, strings.Trim(strings.TrimPrefix(line, "  - "), `"`))
			continue
		}
		if currentList != "" {
			out[currentList] = strings.Join(listVals, "\n")
			currentList, listVals = "", nil
		}
		if i := strings.Index(line, ":"); i > 0 {
			key := strings.TrimSpace(line[:i])
			val := strings.TrimSpace(line[i+1:])
			if val == "" {
				currentList = key
			} else {
				out[key] = strings.Trim(val, `"`)
			}
		}
	}
	if currentList != "" {
		out[currentList] = strings.Join(listVals, "\n")
	}
	return out, body
}

func parseList(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, "\n")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func errIs(err, target error) bool {
	for err != nil {
		if err == target {
			return true
		}
		type unwrapper interface{ Unwrap() error }
		u, ok := err.(unwrapper)
		if !ok {
			return false
		}
		err = u.Unwrap()
	}
	return false
}
