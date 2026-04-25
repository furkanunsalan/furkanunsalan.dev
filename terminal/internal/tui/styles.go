package tui

import "github.com/charmbracelet/lipgloss"

var (
	Accent     = lipgloss.Color("#6366F1")
	Muted      = lipgloss.Color("#71717A")
	MutedDim   = lipgloss.Color("#52525B")
	Surface    = lipgloss.Color("#18181B")
	Text       = lipgloss.Color("#E4E4E7")
	Background = lipgloss.Color("#000000")

	Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(Text)

	Mono = lipgloss.NewStyle().
		Foreground(Muted)

	Tag = lipgloss.NewStyle().
		Foreground(Accent).
		Bold(true)

	Selected = lipgloss.NewStyle().
		Foreground(Accent).
		Bold(true)

	Item = lipgloss.NewStyle().
		Foreground(Text)

	Dim = lipgloss.NewStyle().
		Foreground(MutedDim)

	Help = lipgloss.NewStyle().
		Foreground(MutedDim).
		MarginTop(1)

	Border = lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, true).
		BorderForeground(MutedDim).
		PaddingLeft(2)

	Sidebar = lipgloss.NewStyle().
		Width(18).
		PaddingRight(2)

	Body = lipgloss.NewStyle().
		PaddingLeft(2)

	Header = lipgloss.NewStyle().
		Foreground(Accent).
		Bold(true).
		MarginBottom(1)

	Banner = lipgloss.NewStyle().
		Foreground(Accent).
		Bold(true)
)
