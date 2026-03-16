# Onairo Native Host

This directory contains the optional Codex CLI bridge for Onairo.

## What it does

- Exposes a Chromium native-messaging host named `dev.onairo.codex`
- Accepts `health` and `run` messages from the extension
- Executes `codex exec` in non-interactive mode and returns the final message text from stdout

## Requirements

- `codex` must be installed and available on `PATH`
- Codex CLI must already be authenticated
- The unpacked extension must be loaded so you can read its extension ID

## Install

1. Load the extension from this repo in Chromium or Chrome.
2. Copy the extension ID from `chrome://extensions`.
3. Run:

```bash
node native-host/install-host.mjs --extension-id <your-extension-id>
```

4. Open Onairo settings and enable the Codex bridge.

By default the installer writes manifests for both:

- `~/.config/chromium/NativeMessagingHosts`
- `~/.config/google-chrome/NativeMessagingHosts`

To target one browser only:

```bash
node native-host/install-host.mjs --extension-id <your-extension-id> --browser chromium
```

## Runtime behavior

- The host runs:

```bash
codex exec \
  --skip-git-repo-check \
  --ephemeral \
  --color never \
  -c 'sandbox_mode="read-only"' \
  -c 'approval_policy="never"' \
  -
```

- This was verified locally against the `headless maxxing` post by `@alxfazio`:
  final output on stdout, progress on stderr.
- If a model label is configured in Onairo, it is forwarded with `--model`
- The current working directory defaults to `$HOME`
- The reasoning effort from Onairo is forwarded with `-c model_reasoning_effort=<low|medium|high>`

Override the working directory with:

```bash
export ONAIRO_CODEX_CWD=/absolute/path
```

The Onairo settings page can now also set the working directory directly per bridge config, which takes precedence over the environment variable.

## Notes

- The bridge is text-only in V2.
- Native messaging requires the exact extension ID in the manifest.
- If Codex returns no final message, the host reports that as an error instead of silently succeeding.
