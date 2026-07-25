package data

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sort"
	"time"
)

type Bookmark struct {
	ID      string
	Title   string
	Excerpt string
	Link    string
	Created string
	Tags    []string
	List    string
}

// Mirrors BOOKMARK_LISTS in lib/karakeep.ts: the site only publishes these two
// curated lists, so the terminal must not expose the whole account either.
var bookmarkLists = []struct {
	ID    string
	Title string
}{
	{"oalr80pga230xqpupf836v31", "Posts"},
	{"zy0ciwhnnm9lr113ze8ex51a", "Videos"},
}

const defaultKarakeepHost = "https://bookmarks.furkanunsalan.dev"

func karakeepHost() string {
	if h := os.Getenv("KARAKEEP_API_URL"); h != "" {
		return h
	}
	return defaultKarakeepHost
}

func karakeepKey() string { return os.Getenv("KARAKEEP_API_KEY") }

type karakeepPage struct {
	Bookmarks []struct {
		ID        string `json:"id"`
		CreatedAt string `json:"createdAt"`
		Title     string `json:"title"`
		Tags      []struct {
			Name string `json:"name"`
		} `json:"tags"`
		Content struct {
			URL         string `json:"url"`
			Title       string `json:"title"`
			Description string `json:"description"`
		} `json:"content"`
	} `json:"bookmarks"`
	NextCursor string `json:"nextCursor"`
}

func fetchKarakeepList(ctx context.Context, listID string, limit int) ([]Bookmark, error) {
	u, err := url.Parse(fmt.Sprintf("%s/api/v1/lists/%s/bookmarks", karakeepHost(), listID))
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("limit", fmt.Sprintf("%d", limit))
	q.Set("includeContent", "false")
	u.RawQuery = q.Encode()

	req, _ := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	req.Header.Set("Authorization", "Bearer "+karakeepKey())
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("karakeep status %d", res.StatusCode)
	}

	var page karakeepPage
	if err := json.NewDecoder(res.Body).Decode(&page); err != nil {
		return nil, err
	}

	out := make([]Bookmark, 0, len(page.Bookmarks))
	for _, raw := range page.Bookmarks {
		title := raw.Title
		if title == "" {
			title = raw.Content.Title
		}
		if title == "" {
			title = raw.Content.URL
		}
		if title == "" {
			title = "Untitled"
		}
		link := raw.Content.URL
		if link == "" {
			link = "#"
		}
		tags := make([]string, 0, len(raw.Tags))
		for _, t := range raw.Tags {
			tags = append(tags, t.Name)
		}
		out = append(out, Bookmark{
			ID:      raw.ID,
			Title:   title,
			Excerpt: raw.Content.Description,
			Link:    link,
			Created: raw.CreatedAt,
			Tags:    tags,
		})
	}
	return out, nil
}

func karakeepCreatedAt(b Bookmark) time.Time {
	ts, err := time.Parse(time.RFC3339, b.Created)
	if err != nil {
		return time.Time{}
	}
	return ts
}

// LoadBookmarks fetches the latest N bookmarks across the published lists.
func LoadBookmarks(ctx context.Context, limit int) ([]Bookmark, error) {
	if karakeepKey() == "" {
		return nil, fmt.Errorf("KARAKEEP_API_KEY not set")
	}
	if limit <= 0 || limit > 50 {
		limit = 50
	}

	var all []Bookmark
	seen := map[string]bool{}
	var firstErr error
	for _, list := range bookmarkLists {
		items, err := fetchKarakeepList(ctx, list.ID, limit)
		if err != nil {
			if firstErr == nil {
				firstErr = err
			}
			continue
		}
		for _, b := range items {
			if seen[b.ID] {
				continue
			}
			seen[b.ID] = true
			b.List = list.Title
			all = append(all, b)
		}
	}
	if len(all) == 0 && firstErr != nil {
		return nil, firstErr
	}

	sort.SliceStable(all, func(i, j int) bool {
		return karakeepCreatedAt(all[i]).After(karakeepCreatedAt(all[j]))
	})
	if len(all) > limit {
		all = all[:limit]
	}
	return all, nil
}
