package data

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"time"
)

type Repo struct {
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	HTMLURL     string `json:"html_url"`
	Stars       int    `json:"stargazers_count"`
	Language    string `json:"language"`
	Fork        bool   `json:"fork"`
	Archived    bool   `json:"archived"`
	PushedAt    string `json:"pushed_at"`
}

func ghUser() string {
	if u := os.Getenv("GITHUB_USERNAME"); u != "" {
		return u
	}
	return "furkanunsalan"
}

func ghToken() string { return os.Getenv("GITHUB_TOKEN") }

func LoadRepos(ctx context.Context) ([]Repo, error) {
	if ghToken() == "" {
		return nil, fmt.Errorf("GITHUB_TOKEN not set")
	}
	url := fmt.Sprintf(
		"https://api.github.com/users/%s/repos?per_page=100&type=owner&sort=updated",
		ghUser(),
	)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+ghToken())
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github status %d", res.StatusCode)
	}

	var raw []Repo
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return nil, err
	}

	out := raw[:0]
	for _, r := range raw {
		if r.Fork || r.Archived {
			continue
		}
		out = append(out, r)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Stars > out[j].Stars })
	return out, nil
}
