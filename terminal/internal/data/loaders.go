package data

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type Post struct {
	Slug  string
	Title string
	Date  string
	Tags  []string
	Body  string
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

// 8 s gives a slow VPS plenty of room while still bounding any wedged query.
const queryTimeout = 8 * time.Second

// ----- Posts ---------------------------------------------------------------

func LoadPosts(ctx context.Context) ([]Post, error) {
	p, err := Pool(ctx)
	if err != nil {
		return nil, err
	}
	qctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()
	rows, err := p.Query(qctx, `
		select slug, title, date::text, coalesce(tags, '{}'::text[]), coalesce(content, '')
		from posts
		order by date desc
	`)
	if err != nil {
		return nil, fmt.Errorf("posts query: %w", err)
	}
	defer rows.Close()

	var out []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.Slug, &p.Title, &p.Date, &p.Tags, &p.Body); err != nil {
			return nil, fmt.Errorf("posts scan: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ----- Experiences ---------------------------------------------------------

func LoadExperiences(ctx context.Context) ([]Experience, error) {
	p, err := Pool(ctx)
	if err != nil {
		return nil, err
	}
	qctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()
	rows, err := p.Query(qctx, `
		select
			id, "order", organization, title,
			start_date::text,
			end_date::text,
			coalesce(comment, ''),
			coalesce(links, '[]'::jsonb),
			coalesce(images, '{}'::text[])
		from experiences
		order by "order" asc, start_date desc
	`)
	if err != nil {
		return nil, fmt.Errorf("experiences query: %w", err)
	}
	defer rows.Close()

	var out []Experience
	for rows.Next() {
		var (
			x        Experience
			endDate  *string
			linksRaw []byte
		)
		if err := rows.Scan(
			&x.ID, &x.Order, &x.Organization, &x.Title,
			&x.StartDate, &endDate, &x.Comment, &linksRaw, &x.Images,
		); err != nil {
			return nil, fmt.Errorf("experiences scan: %w", err)
		}
		x.EndDate = endDate
		// links lives as jsonb; we read its raw bytes and decode here so the
		// shape stays in sync with the {label,url} Go struct rather than the
		// pg-side row format.
		// Tolerate a malformed links value (e.g. a legacy double-encoded "[]"):
		// a single bad row must not blank the whole screen — just drop its links.
		if len(linksRaw) > 0 {
			if err := json.Unmarshal(linksRaw, &x.Links); err != nil {
				x.Links = nil
			}
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// ----- Tools ---------------------------------------------------------------

func LoadTools(ctx context.Context) ([]Tool, error) {
	p, err := Pool(ctx)
	if err != nil {
		return nil, err
	}
	qctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()
	rows, err := p.Query(qctx, `
		select
			name,
			coalesce(brand, ''),
			coalesce(what, ''),
			category::text,
			coalesce(comment, ''),
			favorite,
			link
		from tools
		order by name asc
	`)
	if err != nil {
		return nil, fmt.Errorf("tools query: %w", err)
	}
	defer rows.Close()

	var out []Tool
	for rows.Next() {
		var (
			t    Tool
			link *string
		)
		if err := rows.Scan(&t.Name, &t.Brand, &t.What, &t.Category, &t.Comment, &t.Favorite, &link); err != nil {
			return nil, fmt.Errorf("tools scan: %w", err)
		}
		t.Link = link
		out = append(out, t)
	}
	return out, rows.Err()
}
