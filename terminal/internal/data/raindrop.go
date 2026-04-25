package data

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

type Bookmark struct {
	ID      int64    `json:"_id"`
	Title   string   `json:"title"`
	Excerpt string   `json:"excerpt"`
	Link    string   `json:"link"`
	Created string   `json:"created"`
	Tags    []string `json:"tags"`
}

func rdToken() string { return os.Getenv("RAINDROP_TOKEN") }

// LoadBookmarks fetches the latest N bookmarks across all collections.
func LoadBookmarks(ctx context.Context, perPage int) ([]Bookmark, error) {
	if rdToken() == "" {
		return nil, fmt.Errorf("RAINDROP_TOKEN not set")
	}
	if perPage <= 0 || perPage > 50 {
		perPage = 50
	}
	u, _ := url.Parse("https://api.raindrop.io/rest/v1/raindrops/0")
	q := u.Query()
	q.Set("perpage", fmt.Sprintf("%d", perPage))
	q.Set("sort", "-created")
	u.RawQuery = q.Encode()

	req, _ := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	req.Header.Set("Authorization", "Bearer "+rdToken())
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("raindrop status %d", res.StatusCode)
	}

	var body struct {
		Items []Bookmark `json:"items"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, err
	}
	return body.Items, nil
}
