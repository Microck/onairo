# GitHub Prep

## suggested repo

- name: `onairo`
- visibility: `public`
- about: `Chromium MV3 extension for quiet one-shot AI workflows across Kimi, OpenRouter, Z.ai, custom OpenAI-compatible endpoints, and Codex CLI.`
- homepage: leave empty for now
- social preview image: `assets/readme/social-preview.png`

## suggested topics

- `chrome-extension`
- `chromium-extension`
- `manifest-v3`
- `ai`
- `llm`
- `multimodal`
- `codex-cli`
- `openrouter`
- `react`
- `typescript`
- `shadcn-ui`

## local prep

This repo is now initialized with `git` on the `main` branch.

Recommended next steps:

```bash
git status
git add .
git commit -m "feat: prepare Onairo for GitHub"
```

If you want the commit to use your preferred identity from this workspace:

```bash
GIT_AUTHOR_NAME="Microck" GIT_AUTHOR_EMAIL="contact@micr.dev" \
GIT_COMMITTER_NAME="Microck" GIT_COMMITTER_EMAIL="contact@micr.dev" \
git commit -m "feat: prepare Onairo for GitHub"
```

## create the repo

```bash
gh repo create Microck/onairo \
  --public \
  --source=. \
  --remote=origin \
  --description "Chromium MV3 extension for quiet one-shot AI workflows across Kimi, OpenRouter, Z.ai, custom OpenAI-compatible endpoints, and Codex CLI." \
  --disable-wiki
```

## set metadata

```bash
gh repo edit Microck/onairo \
  --enable-issues \
  --add-topic chrome-extension \
  --add-topic chromium-extension \
  --add-topic manifest-v3 \
  --add-topic ai \
  --add-topic llm \
  --add-topic multimodal \
  --add-topic codex-cli \
  --add-topic openrouter \
  --add-topic react \
  --add-topic typescript \
  --add-topic shadcn-ui
```

## push

After the first commit:

```bash
git push -u origin main
```

## notes

- `MIT` is now added in [LICENSE](../LICENSE).
- A dedicated social preview asset now lives at `assets/readme/social-preview.png`.
- GitHub custom social preview upload is usually still a web UI step even after the asset exists locally.
