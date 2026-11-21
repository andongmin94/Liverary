import { msg } from "gt-react";
import { m } from "../../i18n/messages";
import {
  CLOUD_SPEECH_PROVIDER_NAMES,
  type CloudSpeechProvider,
  type STATIC_KEYBINDING_COMMANDS,
  type ScheduledTask,
} from "@t3tools/contracts";
import type { ThemeColorRole } from "@t3tools/shared/themePalettes";
export const settingsThemeColorLabels = {
  canvas: m(msg("Canvas")),
  chrome: m(msg("Chrome")),
  toolbar: m(msg("Toolbar")),
  toolbarForeground: m(msg("Toolbar Foreground")),
  toolbarBorder: m(msg("Toolbar Border")),
  toolbarControl: m(msg("Toolbar Control")),
  toolbarControlForeground: m(msg("Toolbar Control Foreground")),
  toolbarControlHover: m(msg("Toolbar Control Hover")),
  surface: m(msg("Surface")),
  surfaceRaised: m(msg("Surface Raised")),
  surfaceOverlay: m(msg("Surface Overlay")),
  text: m(msg("Text")),
  textMuted: m(msg("Text Muted")),
  border: m(msg("Border")),
  input: m(msg("Input")),
  focus: m(msg("Focus")),
  accent: m(msg("Accent")),
  accentForeground: m(msg("Accent Foreground")),
  secondary: m(msg("Secondary")),
  secondaryForeground: m(msg("Secondary Foreground")),
  muted: m(msg("Muted")),
  mutedForeground: m(msg("Muted Foreground")),
  placeholder: m(msg("Placeholder")),
  secondaryLabel: m(msg("Secondary Label")),
  iconMuted: m(msg("Icon Muted")),
  error: m(msg("Error")),
  errorForeground: m(msg("Error Foreground")),
  errorSurface: m(msg("Error Surface")),
  warning: m(msg("Warning")),
  warningForeground: m(msg("Warning Foreground")),
  warningSurface: m(msg("Warning Surface")),
  update: m(msg("Update")),
  updateForeground: m(msg("Update Foreground")),
  updateSurface: m(msg("Update Surface")),
  accentSurface: m(msg("Accent Surface")),
  accentSurfaceForeground: m(msg("Accent Surface Foreground")),
  messageSurface: m(msg("Message Surface")),
  messageForeground: m(msg("Message Foreground")),
  messageAction: m(msg("Message Action")),
  messageActionForeground: m(msg("Message Action Foreground")),
  messageActionHover: m(msg("Message Action Hover")),
  codeBackground: m(msg("Code Background")),
  codeForeground: m(msg("Code Foreground")),
  searchMatchBackground: m(msg("Search Match Background")),
  searchMatchForeground: m(msg("Search Match Foreground")),
  searchMatchActiveBackground: m(msg("Search Match Active Background")),
  searchMatchActiveForeground: m(msg("Search Match Active Foreground")),
  sidebar: m(msg("Sidebar")),
  sidebarForeground: m(msg("Sidebar Foreground")),
  sidebarMutedForeground: m(msg("Sidebar Muted Foreground")),
  sidebarControlSurface: m(msg("Sidebar Control Surface")),
  sidebarRowHover: m(msg("Sidebar Row Hover")),
  sidebarRowActive: m(msg("Sidebar Row Active")),
  sidebarRowSelected: m(msg("Sidebar Row Selected")),
  sidebarBorder: m(msg("Sidebar Border")),
  terminalBackground: m(msg("Terminal Background")),
  terminalForeground: m(msg("Terminal Foreground")),
  terminalCursor: m(msg("Terminal Cursor")),
  terminalSelection: m(msg("Terminal Selection")),
  terminalScrollbar: m(msg("Terminal Scrollbar")),
  terminalScrollbarHover: m(msg("Terminal Scrollbar Hover")),
} as const satisfies Record<ThemeColorRole, string>;

export const settingsSourceMessages = {
  "Session sharing": m(msg("Session sharing")),
  "Session sharing failed": m(msg("Session sharing failed")),
  "Separate integration session store": m(msg("Separate integration session store")),
  "Shared sessions appear automatically": m(msg("Shared sessions appear automatically")),
  "Session sharing unavailable": m(msg("Session sharing unavailable")),
  "Archive synchronization": m(msg("Archive synchronization")),
  "Delete synchronization": m(msg("Delete synchronization")),
  "Shared with the provider": m(msg("Shared with the provider")),
  "Local archive only": m(msg("Local archive only")),
  "Local delete only": m(msg("Local delete only")),
  "Native transcript deletion only": m(msg("Native transcript deletion only")),
  "Use existing": m(msg("Use existing")),
  "Already downloaded elsewhere? Paste the model file or folder path": m(
    msg("Already downloaded elsewhere? Paste the model file or folder path"),
  ),
  "Path to a model file or folder already on this environment": m(
    msg("Path to a model file or folder already on this environment"),
  ),
  "Could not use a model from that path": m(msg("Could not use a model from that path")),
  "screen reader announcements": m(msg("screen reader announcements")),
  "What a screen reader hears from the open thread: a turn starting, needing you, and ending. Status and messages adds what the agent writes before its last message. Everything adds each step.":
    m(
      msg(
        "What a screen reader hears from the open thread: a turn starting, needing you, and ending. Status and messages adds what the agent writes before its last message. Everything adds each step.",
      ),
    ),
  Everything: m(msg("Everything")),
  "Status and messages": m(msg("Status and messages")),
  "Status only": m(msg("Status only")),
  "Screen reader announcements": m(msg("Screen reader announcements")),
  "Choose a machine": m(msg("Choose a machine")),
  "This app cannot confirm it is one of your machines. The pairing code you paste is sent there.":
    m(
      msg(
        "This app cannot confirm it is one of your machines. The pairing code you paste is sent there.",
      ),
    ),
  "Check this address": m(msg("Check this address")),
  "Best all-around choice for English dictation": m(
    msg("Best all-around choice for English dictation"),
  ),
  "Fast and accurate transcription in many European languages": m(
    msg("Fast and accurate transcription in many European languages"),
  ),
  "Tiny, fast, and runs well on any hardware": m(msg("Tiny, fast, and runs well on any hardware")),
  "Consistently strong in many languages, best for Greek and Polish": m(
    msg("Consistently strong in many languages, best for Greek and Polish"),
  ),
  "Broadest language support, but may run a bit slow": m(
    msg("Broadest language support, but may run a bit slow"),
  ),
  "Multilingual, very accurate in Italian and Spanish. Best on Apple Silicon or discrete GPUs": m(
    msg(
      "Multilingual, very accurate in Italian and Spanish. Best on Apple Silicon or discrete GPUs",
    ),
  ),
  "Best accuracy across 25 European languages": m(
    msg("Best accuracy across 25 European languages"),
  ),
  "Fast and accurate, great overall multilingual pick": m(
    msg("Fast and accurate, great overall multilingual pick"),
  ),
  "Excellent English only model, runs on any hardware": m(
    msg("Excellent English only model, runs on any hardware"),
  ),
  "Best for Chinese, Cantonese, and Asian languages with English": m(
    msg("Best for Chinese, Cantonese, and Asian languages with English"),
  ),
  "Best for Japanese, good at Thai, Indonesian, Malay": m(
    msg("Best for Japanese, good at Thai, Indonesian, Malay"),
  ),
  "Most accurate small model for European languages": m(
    msg("Most accurate small model for European languages"),
  ),
  "Very accurate English. Slow without a GPU.": m(
    msg("Very accurate English. Slow without a GPU."),
  ),
  "Best for Arabic and Arabic/English speakers": m(
    msg("Best for Arabic and Arabic/English speakers"),
  ),
  "Good for Mandarin, English, Japanese": m(msg("Good for Mandarin, English, Japanese")),
  "Russian only.": m(msg("Russian only.")),
  "Best for Russian dictation. English may be unreliable.": m(
    msg("Best for Russian dictation. English may be unreliable."),
  ),
  "Extremely fast English transcription, best on GPU": m(
    msg("Extremely fast English transcription, best on GPU"),
  ),
  "Accurate with translation support. Best with GPU": m(
    msg("Accurate with translation support. Best with GPU"),
  ),
  "For clinicians dictating notes. Poor on general speech": m(
    msg("For clinicians dictating notes. Poor on general speech"),
  ),
  "Tiny English model, virtually instant even on CPU": m(
    msg("Tiny English model, virtually instant even on CPU"),
  ),
  "For overlapping speakers in meetings, not for solo dictation": m(
    msg("For overlapping speakers in meetings, not for solo dictation"),
  ),
  "Top accuracy across languages. Best on Apple Silicon or a GPU": m(
    msg("Top accuracy across languages. Best on Apple Silicon or a GPU"),
  ),
  "Instant Mandarin, Japanese, Korean on any machine. Weak Cantonese": m(
    msg("Instant Mandarin, Japanese, Korean on any machine. Weak Cantonese"),
  ),
  "Accurate with translation support. Best on Apple Silicon or a GPU.": m(
    msg("Accurate with translation support. Best on Apple Silicon or a GPU."),
  ),
  "Wide language support in a relatively small model.": m(
    msg("Wide language support in a relatively small model."),
  ),
  "Accurate in many languages. Slow without a GPU": m(
    msg("Accurate in many languages. Slow without a GPU"),
  ),
  "Taiwan Mandarin with English mixed in. Traditional script, no punctuation": m(
    msg("Taiwan Mandarin with English mixed in. Traditional script, no punctuation"),
  ),
  "Most languages at usable accuracy. Best on Apple Silicon or a GPU.": m(
    msg("Most languages at usable accuracy. Best on Apple Silicon or a GPU."),
  ),

  "Base URL": m(msg("Base URL")),
  "Search threads": m(msg("Search threads")),
  sorry: m(msg("sorry")),

  Auto: m(msg("Auto")),
  dictionary: m(msg("dictionary")),
  "Custom (OpenAI-compatible)": m(msg("Custom (OpenAI-compatible)")),
  "Couldn't read this environment's settings.": m(
    msg("Couldn't read this environment's settings."),
  ),
  "Your organization's provider policy turns off text generators.": m(
    msg("Your organization's provider policy turns off text generators."),
  ),
  "That text generator no longer exists.": m(msg("That text generator no longer exists.")),
  "Restart Liverary. If it stays, run `liverary connect` again.": m(
    msg("Restart Liverary. If it stays, run `liverary connect` again."),
  ),

  "Run `liverary connect`, then restart Liverary so it applies the link.": m(
    msg("Run `liverary connect`, then restart Liverary so it applies the link."),
  ),
  "The tunnel client (cloudflared) is not running.": m(
    msg("The tunnel client (cloudflared) is not running."),
  ),
  "Restart Liverary. If it stays down, check the server log for relay client errors.": m(
    msg("Restart Liverary. If it stays down, check the server log for relay client errors."),
  ),
  "A VPN, proxy, or firewall may block it.": m(msg("A VPN, proxy, or firewall may block it.")),
  "The tunnel is up, but it cannot reach the Liverary server on this machine.": m(
    msg("The tunnel is up, but it cannot reach the Liverary server on this machine."),
  ),
  "Restart Liverary so the tunnel uses the port the server listens on.": m(
    msg("Restart Liverary so the tunnel uses the port the server listens on."),
  ),
  "cloudflared has not connected to Cloudflare yet.": m(
    msg("cloudflared has not connected to Cloudflare yet."),
  ),
  "Wait a minute. If it stays, check the network and the server log.": m(
    msg("Wait a minute. If it stays, check the network and the server log."),
  ),
  "Cloudflare has no live connection from this machine for the tunnel.": m(
    msg("Cloudflare has no live connection from this machine for the tunnel."),
  ),

  "Check the DNS settings on this machine or its VPN.": m(
    msg("Check the DNS settings on this machine or its VPN."),
  ),

  "Check the network, VPN, or proxy on this machine.": m(
    msg("Check the network, VPN, or proxy on this machine."),
  ),
  "Remove connection": m(msg("Remove connection")),
  Open: m(msg("Open")),
  "Must be a coding agent: it reads the pull request over many steps. Off uses the writer model, or Codex or Claude if that model is a text generator.":
    m(
      msg(
        "Must be a coding agent: it reads the pull request over many steps. Off uses the writer model, or Codex or Claude if that model is a text generator.",
      ),
    ),

  "Transcription hardware and model unloading": m(
    msg("Transcription hardware and model unloading"),
  ),
  "Welcome page": m(msg("Welcome page")),

  "Show a predicted next message in the empty composer after a Claude or Codex turn. Tab uses it. Each is an extra cached request on your plan. Needs Codex 0.165+. Claude threads update on restart.":
    m(
      msg(
        "Show a predicted next message in the empty composer after a Claude or Codex turn. Tab uses it. Each is an extra cached request on your plan. Needs Codex 0.165+. Claude threads update on restart.",
      ),
    ),
  "Suggest next prompt": m(msg("Suggest next prompt")),
  "On a Mac, clone new worktrees from a checkout cached in the T3 home folder instead of writing every file. Uses Git’s normal checkout when it can’t. Turning it off deletes the cache.":
    m(
      msg(
        "On a Mac, clone new worktrees from a checkout cached in the T3 home folder instead of writing every file. Uses Git’s normal checkout when it can’t. Turning it off deletes the cache.",
      ),
    ),
  "Fast worktree checkout": m(msg("Fast worktree checkout")),

  "Import from": m(msg("Import from")),

  "Showing access for": m(msg("Showing access for")),

  "Clone into host folders": m(msg("Clone into host folders")),
  Activity: m(msg("Activity", { $context: "settingsCopy.ts" })),
  "Show all": m(msg("Show all")),
  "Hide successful": m(msg("Hide successful")),
  "Hide all": m(msg("Hide all")),
  Zen: m(msg("Zen")),
  "Hide the commands, edits, and searches agents run. Hide successful keeps failures. Zen shows only final answers. Approvals, questions, and errors always show.":
    m(
      msg(
        "Hide the commands, edits, and searches agents run. Hide successful keeps failures. Zen shows only final answers. Approvals, questions, and errors always show.",
      ),
    ),
  "tool calls in chat": m(msg("tool calls in chat")),
  "Clones go to github.com/owner/repo under the folder above, like ghq.": m(
    msg("Clones go to github.com/owner/repo under the folder above, like ghq."),
  ),
  "clone into host folders": m(msg("clone into host folders")),

  "Auto-detect": m(msg("Auto-detect")),
  "Transcription language": m(msg("Transcription language")),

  "Add generator": m(msg("Add generator")),
  "No text generators yet": m(msg("No text generators yet")),
  "Add a model API to write thread titles, commit messages, and other short text without starting a coding agent.":
    m(
      msg(
        "Add a model API to write thread titles, commit messages, and other short text without starting a coding agent.",
      ),
    ),
  "Off · ": m(msg("Off · ")),
  "Show models": m(msg("Show models")),
  "Use it": m(msg("Use it")),
  "Thread titles and other generated text": m(msg("Thread titles and other generated text")),
  "Commit messages, pull requests, and branch names": m(
    msg("Commit messages, pull requests, and branch names"),
  ),
  "Voice transcript cleanup": m(msg("Voice transcript cleanup")),
  "Add a text generator": m(msg("Add a text generator")),
  "Writes thread titles, commit messages, and other short text without starting a coding agent. Your API key is stored on this environment.":
    m(
      msg(
        "Writes thread titles, commit messages, and other short text without starting a coding agent. Your API key is stored on this environment.",
      ),
    ),
  Service: m(msg("Service")),
  "API key (optional)": m(msg("API key (optional)")),
  "Name (optional)": m(msg("Name (optional)")),
  "e.g. My local model": m(msg("e.g. My local model")),
  "Save and continue": m(msg("Save and continue")),
  "Follows the text generation model": m(msg("Follows the text generation model")),

  "The model list couldn't load.": m(msg("The model list couldn't load.")),
  "Loading the model list.": m(msg("Loading the model list.")),

  "OpenRouter model": m(msg("OpenRouter model")),
  "No transcription model matches.": m(msg("No transcription model matches.")),
  "Couldn’t save this change. Check your connection and try again.": m(
    msg("Couldn’t save this change. Check your connection and try again."),
  ),
  "Replace API key": m(msg("Replace API key")),
  "Enter API key": m(msg("Enter API key")),
  "Enter an API key, not a URL or secret reference.": m(
    msg("Enter an API key, not a URL or secret reference."),
  ),
  "Updating the key keeps dictation enabled.": m(msg("Updating the key keeps dictation enabled.")),
  "Leave blank to keep the saved key.": m(msg("Leave blank to keep the saved key.")),
  "Manage OpenRouter dictation": m(msg("Manage OpenRouter dictation")),
  "Retry loading API key": m(msg("Retry loading API key")),
  "Checking for an API key…": m(msg("Checking for an API key…")),
  "Retry loading models": m(msg("Retry loading models")),
  "Loading transcription models…": m(
    msg("Loading transcription models…", { $context: "settingsCopy.ts" }),
  ),
  "This choice applies only to this device. Choose Off to stop sharing.": m(
    msg("This choice applies only to this device. Choose Off to stop sharing."),
  ),
  "Remove key…": m(msg("Remove key…")),
  "Remove key": m(msg("Remove key")),
  "Save and enable": m(msg("Save and enable")),
  "Save key": m(msg("Save key")),

  "Microphone testing is unavailable in this browser. Use HTTPS or the desktop app.": m(
    msg("Microphone testing is unavailable in this browser. Use HTTPS or the desktop app."),
  ),
  "No audio was recorded. Try again.": m(msg("No audio was recorded. Try again.")),
  "Could not record microphone audio. Try again.": m(
    msg("Could not record microphone audio. Try again."),
  ),
  "The microphone disconnected.": m(
    msg("The microphone disconnected.", { $context: "settingsCopy.ts" }),
  ),
  "Could not access the microphone.": m(msg("Could not access the microphone.")),
  "Test microphone": m(msg("Test microphone")),
  "Cancel microphone test": m(msg("Cancel microphone test")),
  "Recording time": m(msg("Recording time")),
  "Microphone input level": m(msg("Microphone input level")),
  "Opening microphone…": m(msg("Opening microphone…")),
  "Stop recording": m(msg("Stop recording")),
  "Pause recording": m(msg("Pause recording")),
  "Play recording": m(msg("Play recording")),
  "Recording playback position": m(msg("Recording playback position")),
  "Record again": m(msg("Record again")),
  "Could not play this recording. Try recording again.": m(
    msg("Could not play this recording. Try recording again."),
  ),

  Immediately: m(msg("Immediately")),
  "After 2 minutes": m(msg("After 2 minutes")),
  "After 5 minutes": m(msg("After 5 minutes")),
  "After 10 minutes": m(msg("After 10 minutes")),
  "After 15 minutes": m(msg("After 15 minutes")),
  "After 1 hour": m(msg("After 1 hour")),
  Recommended: m(msg("Recommended")),
  "A good default pick for the languages it covers.": m(
    msg("A good default pick for the languages it covers."),
  ),
  "Live preview": m(msg("Live preview")),
  "Shows words in your draft as you speak, before the recording finishes.": m(
    msg("Shows words in your draft as you speak, before the recording finishes."),
  ),
  Translate: m(msg("Translate")),
  "Can write English text from speech in another language. Turn on Translate to English to use it.":
    m(
      msg(
        "Can write English text from speech in another language. Turn on Translate to English to use it.",
      ),
    ),
  "Verifying download…": m(msg("Verifying download…")),

  Selected: m(msg("Selected")),
  "Use model": m(msg("Use model")),

  Misspelling: m(msg("Misspelling")),
  Alias: m(msg("Alias")),
  "Project dictionary": m(msg("Project dictionary")),
  "Shared dictionary": m(msg("Shared dictionary")),
  "project dictionary": m(msg("project dictionary")),
  "shared dictionary": m(msg("shared dictionary")),
  "Cleanup model not saved": m(msg("Cleanup model not saved")),
  "Cleanup model": m(msg("Cleanup model")),
  "Model for transcript cleanup, such as a cheaper or faster one. When disabled, use the text generation model configured for this environment.":
    m(
      msg(
        "Model for transcript cleanup, such as a cheaper or faster one. When disabled, use the text generation model configured for this environment.",
      ),
    ),
  "Connect an environment first.": m(msg("Connect an environment first.")),
  "Use a separate cleanup model": m(msg("Use a separate cleanup model")),
  "Could not load transcription models": m(msg("Could not load transcription models")),
  Hardware: m(msg("Hardware")),
  "Auto uses the environment’s GPU when it has one.": m(
    msg("Auto uses the environment’s GPU when it has one."),
  ),
  "Could not change transcription hardware": m(msg("Could not change transcription hardware")),
  "Transcription hardware": m(msg("Transcription hardware")),
  "Selected GPU": m(msg("Selected GPU")),
  "Unload model": m(msg("Unload model")),
  "Release the model’s memory on the environment after it sits idle.": m(
    msg("Release the model’s memory on the environment after it sits idle."),
  ),
  "Could not change when the model unloads": m(msg("Could not change when the model unloads")),
  "Search languages": m(msg("Search languages")),
  "Browse models by language": m(msg("Browse models by language")),
  "All languages": m(msg("All languages")),
  "No languages match.": m(msg("No languages match.")),
  "Search transcription models": m(msg("Search transcription models")),
  "Search models": m(msg("Search models")),
  "Sort by": m(msg("Sort by")),
  "Downloaded only": m(msg("Downloaded only")),
  "Transcription models": m(msg("Transcription models")),
  "Could not download the model": m(msg("Could not download the model")),
  "Could not select the model": m(msg("Could not select the model")),
  "Could not cancel the download": m(msg("Could not cancel the download")),
  "Could not delete the model": m(msg("Could not delete the model")),
  "Test model": m(msg("Test model")),
  "Waiting for the environment to connect": m(msg("Waiting for the environment to connect")),
  "Close model test": m(msg("Close model test")),
  "Test transcript": m(msg("Test transcript")),
  "No speech recognized. Try again.": m(msg("No speech recognized. Try again.")),
  "Manage OpenRouter": m(msg("Manage OpenRouter")),
  "Manage key": m(msg("Manage key")),

  Microphone: m(msg("Microphone")),
  "Refresh microphones": m(msg("Refresh microphones", { $context: "settingsCopy.ts" })),
  "Dictation shortcut": m(msg("Dictation shortcut")),
  "Dictation shortcut mode": m(msg("Dictation shortcut mode")),
  Transcription: m(msg("Transcription")),
  "Transcribe with": m(msg("Transcribe with")),
  Use: m(msg("Use")),
  "Chosen environment (unavailable)": m(msg("Chosen environment (unavailable)")),
  "unavailable environment": m(msg("unavailable environment")),
  "On an environment": m(msg("On an environment")),
  Language: m(msg("Language")),
  "Translate to English": m(msg("Translate to English")),
  "Speak any language and get English text.": m(msg("Speak any language and get English text.")),
  "Silence filtering": m(msg("Silence filtering")),
  "Remove filler words": m(msg("Remove filler words")),
  "Remove filler words like “um” and “uh” from transcripts.": m(
    msg("Remove filler words like “um” and “uh” from transcripts."),
  ),
  Dictionary: m(msg("Dictionary")),

  "Clean up transcripts": m(msg("Clean up transcripts")),
  "Fixes punctuation, numbers, and spoken corrections with the cleanup model on the draft’s environment. Sends the transcript and nearby draft text, never audio.":
    m(
      msg(
        "Fixes punctuation, numbers, and spoken corrections with the cleanup model on the draft’s environment. Sends the transcript and nearby draft text, never audio.",
      ),
    ),
  "Cleanup instructions": m(msg("Cleanup instructions")),
  "Built-in": m(msg("Built-in")),
  "Custom cleanup instructions": m(msg("Custom cleanup instructions")),
  "Correction cue": m(msg("Correction cue")),

  "New thread each run": m(msg("New thread each run")),
  "One thread, continuing the conversation": m(msg("One thread, continuing the conversation")),
  "One thread, fresh session each run": m(msg("One thread, fresh session each run")),
  "Started by the first run": m(msg("Started by the first run")),
  "Destination thread": m(msg("Destination thread")),
  "Search all threads...": m(msg("Search all threads...")),
  "No threads found.": m(msg("No threads found.")),
  "Deleting the thread also deletes this task.": m(
    msg("Deleting the thread also deletes this task."),
  ),
  "The first run starts a thread with the workspace and model below. Later runs continue that conversation.":
    m(
      msg(
        "The first run starts a thread with the workspace and model below. Later runs continue that conversation.",
      ),
    ),
  "The first run starts a thread with the workspace and model below. Later runs post there, each in a fresh session without earlier runs' context.":
    m(
      msg(
        "The first run starts a thread with the workspace and model below. Later runs post there, each in a fresh session without earlier runs' context.",
      ),
    ),
  "Each run starts a fresh session in this thread, without earlier runs' context.": m(
    msg("Each run starts a fresh session in this thread, without earlier runs' context."),
  ),

  Reclaim: m(msg("Reclaim")),
  "Restart and reclaim": m(msg("Restart and reclaim")),

  "Tool calls in chat": m(msg("Tool calls in chat")),
  "For thread titles and other generated text. Source control has its own setting. Text generators from Providers also appear here.":
    m(
      msg(
        "For thread titles and other generated text. Source control has its own setting. Text generators from Providers also appear here.",
      ),
    ),
  "See your agents, import projects, and set up your phone.": m(
    msg("See your agents, import projects, and set up your phone."),
  ),
  Voice: m(msg("Voice")),
  "Text generators": m(msg("Text generators")),

  "Could not install liverary": m(msg("Could not install liverary")),
  "Could not remove liverary": m(msg("Could not remove liverary")),
  "Could not add liverary to PATH": m(msg("Could not add liverary to PATH")),
  "Add to PATH": m(msg("Add to PATH")),
  "Show folder threads on two lines: the title, then the branch, pull request, and agent.": m(
    msg("Show folder threads on two lines: the title, then the branch, pull request, and agent."),
  ),
  ". While off, nothing new starts over a link; running tasks finish.": m(
    msg(". While off, nothing new starts over a link; running tasks finish."),
  ),

  retrying: m(msg("retrying")),
  "Choose files": m(msg("Choose files")),
  "All checkouts": m(msg("All checkouts")),
  "Saved. Restart the server to apply.": m(msg("Saved. Restart the server to apply.")),
  "Prompt preview example": m(msg("Prompt preview example")),
  "connection diagnostics": m(msg("connection diagnostics")),
  "trace ID": m(msg("trace ID")),
  "webhook URL": m(msg("webhook URL")),
  "project actions update": m(msg("project actions update")),
  "action shortcut update": m(msg("action shortcut update")),
  "action shortcut removal": m(msg("action shortcut removal")),

  "Last Seen": m(msg("Last Seen")),
  Renderer: m(msg("Renderer")),
  Monitor: m(msg("Monitor")),
  Connecting: m(msg("Connecting")),
  Reconnecting: m(msg("Reconnecting")),
  "Install Git from https://git-scm.com/downloads or with your package manager.": m(
    msg("Install Git from https://git-scm.com/downloads or with your package manager."),
  ),
  "Install Jujutsu with `brew install jj` or from https://github.com/jj-vcs/jj.": m(
    msg("Install Jujutsu with `brew install jj` or from https://github.com/jj-vcs/jj."),
  ),
  "Install the GitHub command-line tool (`gh`) via https://cli.github.com/ or your package manager (for example `brew install gh`).":
    m(
      msg(
        "Install the GitHub command-line tool (`gh`) via https://cli.github.com/ or your package manager (for example `brew install gh`).",
      ),
    ),
  "Install the GitLab command-line tool (`glab`) from https://gitlab.com/gitlab-org/cli or your package manager (for example `brew install glab`).":
    m(
      msg(
        "Install the GitLab command-line tool (`glab`) from https://gitlab.com/gitlab-org/cli or your package manager (for example `brew install glab`).",
      ),
    ),
  "Install the Azure command-line tools (`az`), then enable Azure DevOps support with `az extension add --name azure-devops`.":
    m(
      msg(
        "Install the Azure command-line tools (`az`), then enable Azure DevOps support with `az extension add --name azure-devops`.",
      ),
    ),
  "Add a Bitbucket token in Settings → Source Control.": m(
    msg("Add a Bitbucket token in Settings → Source Control."),
  ),
  "Install `fj` 0.6 or later from https://codeberg.org/forgejo-contrib/forgejo-cli and run `fj --host <server-url> auth add-token`, or install `tea` 0.16 or later from https://gitea.com/gitea/tea and run `tea login add` for each Forgejo or Gitea server.":
    m(
      msg(
        "Install `fj` 0.6 or later from https://codeberg.org/forgejo-contrib/forgejo-cli and run `fj --host '<server-url>' auth add-token`, or install `tea` 0.16 or later from https://gitea.com/gitea/tea and run `tea login add` for each Forgejo or Gitea server.",
      ),
    ),
  "Run `tea login add` to authenticate a Forgejo or Gitea server.": m(
    msg("Run `tea login add` to authenticate a Forgejo or Gitea server."),
  ),
  "Could not read fj authentication storage. Authenticate again with fj.": m(
    msg("Could not read fj authentication storage. Authenticate again with fj."),
  ),
  "Authenticate this server with `fj --host <server-url> auth add-token`. For a server under a URL subpath, such as `https://example.com/forgejo`, use `tea login add` instead.":
    m(
      msg(
        "Authenticate this server with `fj --host '<server-url>' auth add-token`. For a server under a URL subpath, such as `https://example.com/forgejo`, use `tea login add` instead.",
      ),
    ),
  "Every GitHub host gh is signed in to is turned off in Settings → Source Control.": m(
    msg("Every GitHub host gh is signed in to is turned off in Settings → Source Control."),
  ),
  "Run `gh auth login` to authenticate GitHub CLI with an active account.": m(
    msg("Run `gh auth login` to authenticate GitHub CLI with an active account."),
  ),
  "GitHub CLI is too old to report sign-in status. Update `gh` to 2.81.0 or newer (for example `brew upgrade gh`) and rescan.":
    m(
      msg(
        "GitHub CLI is too old to report sign-in status. Update `gh` to 2.81.0 or newer (for example `brew upgrade gh`) and rescan.",
      ),
    ),
  "Run `gh auth login` to authenticate GitHub CLI.": m(
    msg("Run `gh auth login` to authenticate GitHub CLI."),
  ),
  "GitHub CLI auth status could not be parsed.": m(
    msg("GitHub CLI auth status could not be parsed."),
  ),
  "Run `glab auth login` to authenticate GitLab CLI.": m(
    msg("Run `glab auth login` to authenticate GitLab CLI."),
  ),
  "GitLab CLI auth status could not be parsed.": m(
    msg("GitLab CLI auth status could not be parsed."),
  ),
  "Run `az login` to authenticate Azure CLI.": m(msg("Run `az login` to authenticate Azure CLI.")),
  "Azure CLI account status could not be parsed.": m(
    msg("Azure CLI account status could not be parsed."),
  ),
  "An access token is configured.": m(msg("An access token is configured.")),
  "An API token is configured.": m(msg("An API token is configured.")),
  "Add a Bitbucket token in Settings → Source Control, or set the T3CODE_BITBUCKET_* environment variables on the server.":
    m(
      msg(
        "Add a Bitbucket token in Settings → Source Control, or set the T3CODE_BITBUCKET_* environment variables on the server.",
      ),
    ),
  "The hosting service did not answer in time. Refresh to try again.": m(
    msg("The hosting service did not answer in time. Refresh to try again."),
  ),
  "read and write access to pull requests and contents": m(
    msg("read and write access to pull requests and contents"),
  ),
  hours: m(msg("Time")),
  "Show full message": m(msg("Show full message")),
  "minutes, optional": m(msg("minutes, optional")),
  "template, optional": m(msg("template, optional")),
  "seconds, 10–3600": m(msg("seconds, 10–3600")),
  "Click to reveal account": m(msg("Click to reveal account", { $context: "settingsCopy.ts" })),
  "Click to hide account": m(msg("Click to hide account", { $context: "settingsCopy.ts" })),
  "Show account": m(msg("Show account")),
  "Hide account": m(msg("Hide account")),
  Unknown: m(msg("Unknown")),

  "Select icon": m(msg("Select icon")),
  "Toggle account visibility": m(msg("Toggle account visibility")),
  "Prompt font preview": m(msg("Prompt font preview")),
  "Signed-in GitHub account": m(msg("Signed-in GitHub account")),
  "Toggle source control account visibility": m(msg("Toggle source control account visibility")),
  "ACP Registry": m(msg("ACP Registry")),
  Downloading: m(msg("Downloading")),
  Preparing: m(msg("Preparing")),
  Identity: m(msg("Identity")),
  Config: m(msg("Config")),
  Subprocess: m(msg("Subprocess")),
  Agent: m(msg("Agent")),
  Root: m(msg("Root")),
  Child: m(msg("Child")),
  Cause: m(msg("Cause")),
  Duration: m(msg("Duration", { $context: "settingsCopy.ts" })),
  Ended: m(msg("Ended")),
  Max: m(msg("Max")),
  "Connection failed": m(msg("Connection failed")),
  "Switched off": m(msg("Switched off")),
  "Opened window": m(msg("Opened window")),
  "Run failed": m(msg("Run failed")),
  "Bad signature": m(msg("Bad signature")),
  "Task paused": m(msg("Task paused")),
  "Rate limited": m(msg("Rate limited")),
  "Too old": m(msg("Too old")),
  Battery: m(msg("Battery")),
  Suspended: m(msg("Suspended")),
  Locked: m(msg("Locked")),
  Unlocked: m(msg("Unlocked")),
  Restarting: m(msg("Restarting")),
  "Request accepted": m(msg("Request accepted")),
  Duplicate: m(msg("Duplicate")),
  Coalesced: m(msg("Coalesced")),
  Filtered: m(msg("Filtered")),
  Sun: m(msg("Sun")),
  Mon: m(msg("Mon")),
  Tue: m(msg("Tue")),
  Wed: m(msg("Wed")),
  Thu: m(msg("Thu")),
  Fri: m(msg("Fri")),
  Sat: m(msg("Sat")),
  Su: m(msg("Su")),
  Mo: m(msg("Mo")),
  Tu: m(msg("Tu")),
  We: m(msg("We")),
  Th: m(msg("Th")),
  Fr: m(msg("Fr")),
  Sa: m(msg("Sa")),
  Daily: m(msg("Daily")),
  Weekdays: m(msg("Weekdays")),
  In: m(msg("In")),
  Today: m(msg("Today")),
  Tomorrow: m(msg("Tomorrow")),
  Monday: m(msg("Monday")),
  Tuesday: m(msg("Tuesday")),
  Wednesday: m(msg("Wednesday")),
  Thursday: m(msg("Thursday")),
  Friday: m(msg("Friday")),
  Saturday: m(msg("Saturday")),
  Sunday: m(msg("Sunday")),
  Show: m(msg("Show", { $context: "settingsCopy.ts" })),
  Installing: m(msg("Installing")),
  "in under a minute": m(msg("in under a minute")),
  "Not connected:": m(msg("Not connected:")),
  "Loading scheduled tasks on": m(msg("Loading scheduled tasks on")),
  "Could not load scheduled tasks:": m(msg("Could not load scheduled tasks:")),
  "No tasks on": m(msg("No tasks on")),
  "Rotate this webhook URL? The current URL stops working.": m(
    msg("Rotate this webhook URL? The current URL stops working."),
  ),
  "Scheduled task is incomplete": m(msg("Scheduled task is incomplete")),
  "Add a title, prompt, project, and model.": m(msg("Add a title, prompt, project, and model.")),
  "Invalid filter": m(msg("Invalid filter")),
  "Signing secret is required": m(msg("Signing secret is required")),
  "Enter the signature header and secret.": m(msg("Enter the signature header and secret.")),
  "Invalid interval": m(msg("Invalid interval")),
  "Enter an interval of at least one minute.": m(msg("Enter an interval of at least one minute.")),
  "Checkout path is required": m(msg("Checkout path is required")),
  "Enter the path of the checkout to run in.": m(msg("Enter the path of the checkout to run in.")),
  "Could not save scheduled task": m(msg("Could not save scheduled task")),
  "This setting is environment-wide and cannot be overridden by a project.": m(
    msg("This setting is environment-wide and cannot be overridden by a project."),
  ),
  "Connect the selected checkouts, or update their environments, to save a project override.": m(
    msg(
      "Connect the selected checkouts, or update their environments, to save a project override.",
    ),
  ),
  "an environment": m(msg("an environment")),
  "Connect the selected checkouts, or update their environments, to reset this override.": m(
    msg("Connect the selected checkouts, or update their environments, to reset this override."),
  ),
  "Connect the environments to reset these overrides.": m(
    msg("Connect the environments to reset these overrides."),
  ),
  "Enter the 1Password account.": m(msg("Enter the 1Password account.")),
  "The name needs at least one letter or digit.": m(
    msg("The name needs at least one letter or digit."),
  ),
  "A secret provider with this name exists.": m(msg("A secret provider with this name exists.")),
  "Select a project to choose one of its checkouts.": m(
    msg("Select a project to choose one of its checkouts."),
  ),
  "The ACP could not be prepared.": m(msg("The ACP could not be prepared.")),
  "Already added": m(msg("Already added")),
  "Headers must be valid JSON.": m(msg("Headers must be valid JSON.")),
  "Headers must be a JSON object with string values.": m(
    msg("Headers must be a JSON object with string values."),
  ),
  "Could not list ACP sessions": m(msg("Could not list ACP sessions")),
  "Could not import ACP session": m(msg("Could not import ACP session")),
  "Could not delete ACP session": m(msg("Could not delete ACP session")),
  "Could not list ACP providers": m(msg("Could not list ACP providers")),
  "Could not configure ACP provider": m(msg("Could not configure ACP provider")),
  "Could not disable ACP provider": m(msg("Could not disable ACP provider")),
  "Could not log out of ACP agent": m(msg("Could not log out of ACP agent")),
  "Failed to add backend.": m(msg("Failed to add backend.")),
  "Could not add the route.": m(msg("Could not add the route.")),
  "Not connected yet.": m(msg("Not connected yet.")),
  "Failed to create pairing URL.": m(msg("Failed to create pairing URL.")),
  "Pauses probes for idle clients, locked hosts, or low power mode.": m(
    msg("Pauses probes for idle clients, locked hosts, or low power mode."),
  ),
  "Allows scoped background probes while any subscribed client remains connected.": m(
    msg("Allows scoped background probes while any subscribed client remains connected."),
  ),
  "Also pauses background probes when the host or client is on battery.": m(
    msg("Also pauses background probes when the host or client is on battery."),
  ),
  "Uses custom intervals.": m(msg("Uses custom intervals.")),
  "That profile is no longer available. Choose where to import these cookies.": m(
    msg("That profile is no longer available. Choose where to import these cookies."),
  ),
  "no cookies": m(msg("no cookies")),
  "Could not open System Settings. Try Allow again.": m(
    msg("Could not open System Settings. Try Allow again."),
  ),
  "You've reached the profile limit. Choose an existing profile to import into.": m(
    msg("You've reached the profile limit. Choose an existing profile to import into."),
  ),
  "Created for these cookies": m(msg("Created for these cookies")),
  "Existing profile": m(msg("Existing profile")),
  "Turn on Network access to detect Tailscale.": m(
    msg("Turn on Network access to detect Tailscale."),
  ),
  "Start Tailscale to set up HTTPS access through MagicDNS.": m(
    msg("Start Tailscale to set up HTTPS access through MagicDNS."),
  ),
  "Up to date": m(msg("Up to date")),
  "Downloading update": m(msg("Downloading update")),
  "Update downloaded": m(msg("Update downloaded")),
  "SSH host or alias is required.": m(msg("SSH host or alias is required.")),
  "SSH port must be between 1 and 65535.": m(msg("SSH port must be between 1 and 65535.")),
  "Enter a backend host.": m(msg("Enter a backend host.")),
  "Enter a pairing code.": m(msg("Enter a pairing code.")),
  "Failed to connect SSH host.": m(msg("Failed to connect SSH host.")),
  "Opens the hosted app, no install needed": m(msg("Opens the hosted app, no install needed")),
  "Devices on the same network": m(msg("Devices on the same network")),
  "Devices on your private network": m(msg("Devices on your private network")),
  "Reachable from anywhere": m(msg("Reachable from anywhere")),
  "Clients on this machine": m(msg("Clients on this machine")),
  "Connection checks passed": m(msg("Connection checks passed")),
  "Check access before saving": m(msg("Check access before saving")),
  "Multiple hosts match this SSH destination. Select the environment to edit its hosts.": m(
    msg("Multiple hosts match this SSH destination. Select the environment to edit its hosts."),
  ),
  "Device host not removed everywhere": m(msg("Device host not removed everywhere")),
  "Device host not saved everywhere": m(msg("Device host not saved everywhere")),
  "Simlock host not saved everywhere": m(msg("Simlock host not saved everywhere")),
  "Simlock host not removed everywhere": m(msg("Simlock host not removed everywhere")),
  "Not added": m(msg("Not added")),
  "Unable to open logs folder.": m(msg("Unable to open logs folder.")),
  "Sessions at once": m(msg("Sessions at once")),
  "Session minutes": m(msg("Session minutes")),
  "Idle minutes": m(msg("Idle minutes")),
  "Connect to this environment to change its icon.": m(
    msg("Connect to this environment to change its icon."),
  ),
  "Your session on this environment cannot change its settings.": m(
    msg("Your session on this environment cannot change its settings."),
  ),
  "Reorder routes": m(msg("Reorder routes")),
  "Show full error": m(msg("Show full error")),
  "Browser profile data is not available to clear.": m(
    msg("Browser profile data is not available to clear."),
  ),
  "Browser profile limit reached.": m(msg("Browser profile limit reached.")),
  "Your default browser": m(msg("Your default browser")),
  "This connection cannot change device settings.": m(
    msg("This connection cannot change device settings."),
  ),
  "Connect to an environment before removing this profile.": m(
    msg("Connect to an environment before removing this profile."),
  ),
  "Profile data could not be deleted. Try again.": m(
    msg("Profile data could not be deleted. Try again."),
  ),
  "Only available in the desktop app.": m(msg("Only available in the desktop app.")),
  "Searching project files…": m(msg("Searching project files…")),
  "Indexing project files…": m(msg("Indexing project files…")),
  "No matching image files.": m(msg("No matching image files.")),
  "No image files found.": m(msg("No image files found.")),
  "Could not open the provider link.": m(msg("Could not open the provider link.")),
  "Could not load the sign-in terminal. Cancel and retry sign-in.": m(
    msg("Could not load the sign-in terminal. Cancel and retry sign-in."),
  ),
  "read and act": m(msg("read and act")),
  "read PRs": m(msg("read PRs")),
  "Backend child": m(msg("Backend child")),
  "Electron main": m(msg("Electron main")),
  "Electron utility": m(msg("Electron utility")),
  "Liverary process": m(msg("Liverary process")),
  "Storage bytes": m(msg("Storage bytes")),
  "Logical bytes": m(msg("Logical bytes")),
  "No reported errors": m(msg("No reported errors")),
  "This environment is no longer available.": m(msg("This environment is no longer available.")),
  "This project has no checkout on this environment.": m(
    msg("This project has no checkout on this environment."),
  ),
  "This checkout's environment is no longer available.": m(
    msg("This checkout's environment is no longer available."),
  ),
  "Devices at once": m(msg("Devices at once")),
  "Lease minutes": m(msg("Lease minutes")),
  "Give the host a label.": m(msg("Give the host a label.")),
  "Enter the gateway's origin, such as https://gateway.example.ts.net:4700.": m(
    msg("Enter the gateway's origin, such as https://gateway.example.ts.net:4700."),
  ),
  "Keep the limits within the ranges shown.": m(msg("Keep the limits within the ranges shown.")),
  "Checking snapshots…": m(msg("Checking snapshots…")),
  "Not supported on this platform.": m(msg("Not supported on this platform.")),
  "Turn this on to set up snapshots.": m(msg("Turn this on to set up snapshots.")),
  "Capture needs attention": m(msg("Capture needs attention")),
  "Check capture access in setup": m(msg("Check capture access in setup")),
  "Install the capture helper to continue": m(msg("Install the capture helper to continue")),
  "Set up active-window snapshots": m(msg("Set up active-window snapshots")),
  "Manual capture only. You'll choose a window each time": m(
    msg("Manual capture only. You'll choose a window each time"),
  ),
  "Enable capture to continue": m(msg("Enable capture to continue")),
  "Connecting your shortcut…": m(msg("Connecting your shortcut…")),
  "Waiting for shortcut permission": m(msg("Waiting for shortcut permission")),
  "Ready to capture": m(msg("Ready to capture")),
  "Use your shortcut from another app": m(msg("Use your shortcut from another app")),
  "Finish shortcut setup": m(msg("Finish shortcut setup")),
  "Approve the shortcut permission prompt to continue.": m(
    msg("Approve the shortcut permission prompt to continue."),
  ),
  "Shortcut saved.": m(msg("Shortcut saved.")),
  "Continue setup": m(msg("Continue setup")),
  "Manage capture": m(msg("Manage capture")),
  "Capture effects aren't available on this desktop.": m(
    msg("Capture effects aren't available on this desktop."),
  ),
  "Install or update the capture helper to enable effects.": m(
    msg("Install or update the capture helper to enable effects."),
  ),
  "Capture effects aren't available on Niri.": m(msg("Capture effects aren't available on Niri.")),
  "Update the GNOME extension, then sign out and back in to enable effects.": m(
    msg("Update the GNOME extension, then sign out and back in to enable effects."),
  ),
  "Finish extension setup to enable effects.": m(msg("Finish extension setup to enable effects.")),
  "Automatic capture isn't available here. Choose a window instead.": m(
    msg("Automatic capture isn't available here. Choose a window instead."),
  ),
  "Capture a window and attach it to your current draft.": m(
    msg("Capture a window and attach it to your current draft."),
  ),
  "This desktop only provides a screenshot.": m(msg("This desktop only provides a screenshot.")),
  "Update the desktop app to use snapshots.": m(msg("Update the desktop app to use snapshots.")),
  "Couldn't check capture setup": m(msg("Couldn't check capture setup")),
  "Couldn't open shortcut permissions": m(msg("Couldn't open shortcut permissions")),
  "Couldn't complete capture setup": m(msg("Couldn't complete capture setup")),
  "Couldn't save capture settings": m(msg("Couldn't save capture settings")),
  "Couldn't allow app text capture": m(msg("Couldn't allow app text capture")),
  "Checking shortcut…": m(msg("Checking shortcut…")),
  "Ready to save.": m(msg("Ready to save.")),
  "Try a shortcut such as Ctrl+Shift+2.": m(msg("Try a shortcut such as Ctrl+Shift+2.")),
  "Couldn't verify capture access": m(msg("Couldn't verify capture access")),
  "Couldn't close capture setup": m(msg("Couldn't close capture setup")),
  "Still unable to check access. See Advanced for help.": m(
    msg("Still unable to check access. See Advanced for help."),
  ),
  "Ready. You'll choose a window each time.": m(msg("Ready. You'll choose a window each time.")),
  "Still waiting for you to sign out and back in.": m(
    msg("Still waiting for you to sign out and back in."),
  ),
  "Ready. Continue to choose your shortcut.": m(msg("Ready. Continue to choose your shortcut.")),
  "Not ready yet. Finish the step above.": m(msg("Not ready yet. Finish the step above.")),
  "Permission status unavailable": m(msg("Permission status unavailable")),
  "Choose your shortcut": m(msg("Choose your shortcut")),
  "Click the shortcut, then press the keys you want.": m(
    msg("Click the shortcut, then press the keys you want."),
  ),
  "Choose your keys, then approve the permission prompt if asked.": m(
    msg("Choose your keys, then approve the permission prompt if asked."),
  ),
  "Use both Shift keys, or record a different shortcut.": m(
    msg("Use both Shift keys, or record a different shortcut."),
  ),
  "Passed for today": m(msg("Passed for today")),
  "Duplicate of an option above": m(msg("Duplicate of an option above")),
  "Same time as an option above": m(msg("Same time as an option above")),
  "Signed in": m(msg("Signed in")),
  "Approve the app on GitHub to finish signing in.": m(
    msg("Approve the app on GitHub to finish signing in."),
  ),
  "A far higher GitHub API rate limit than a personal token or gh login.": m(
    msg("A far higher GitHub API rate limit than a personal token or gh login."),
  ),
  "Set by environment": m(msg("Set by environment")),
  "Set by desktop": m(msg("Set by desktop")),
  "Toolbar text": m(msg("Toolbar text")),
  "Toolbar control text": m(msg("Toolbar control text")),
  "Error text": m(msg("Error text")),
  "Warning text": m(msg("Warning text")),
  "Update text": m(msg("Update text")),
  "Name your theme first.": m(msg("Name your theme first.")),
  "Theme saved, but it could not be made active. Try again.": m(
    msg("Theme saved, but it could not be made active. Try again."),
  ),
  "Could not save the theme.": m(msg("Could not save the theme.")),
  "Could not create the theme.": m(msg("Could not create the theme.")),
  "Could not read that file. Paste the JSON below instead.": m(
    msg("Could not read that file. Paste the JSON below instead."),
  ),
  "not a theme file": m(msg("not a theme file")),
  "could not install": m(msg("could not install")),
  "Theme added, but it could not be selected. Try again.": m(
    msg("Theme added, but it could not be selected. Try again."),
  ),
  "That theme file is invalid.": m(msg("That theme file is invalid.")),
  "Open VSX search failed.": m(msg("Open VSX search failed.")),
  "Installed themes could not be read.": m(msg("Installed themes could not be read.")),
  "That theme could not be added.": m(msg("That theme could not be added.")),
  "This connection cannot test device hosts.": m(msg("This connection cannot test device hosts.")),
  "No available machine, or another action change is saving.": m(
    msg("No available machine, or another action change is saving."),
  ),
  "a selected environment": m(msg("a selected environment")),
  "Could not start shortcut recording.": m(msg("Could not start shortcut recording.")),
  "Add a letter, number, or function key to your shortcut.": m(
    msg("Add a letter, number, or function key to your shortcut."),
  ),
  "Settings content": m(msg("Settings content")),
  "Choose an agent": m(msg("Choose an agent")),
  "Search ACP Registry": m(msg("Search ACP Registry")),
  "Search agents…": m(msg("Search agents…")),
  "Searching the ACP Registry.": m(msg("Searching the ACP Registry.")),
  "Refreshing ACP Registry results.": m(msg("Refreshing ACP Registry results.")),
  "Searching the registry...": m(msg("Searching the registry...")),
  "No compatible agents found": m(msg("No compatible agents found")),
  "Try a broader search.": m(msg("Try a broader search.")),
  Added: m(msg("Added")),
  "The ACP operation failed.": m(msg("The ACP operation failed.")),
  "ACP session imported": m(msg("ACP session imported")),
  "ACP session already imported": m(msg("ACP session already imported")),
  "Invalid provider headers": m(msg("Invalid provider headers")),
  "Resume agent-owned conversations as Liverary threads.": m(
    msg("Resume agent-owned conversations as Liverary threads."),
  ),
  "Add a project before importing sessions.": m(msg("Add a project before importing sessions.")),
  "Logging out": m(msg("Logging out")),
  "Log out": m(msg("Log out")),
  "Project for ACP sessions": m(msg("Project for ACP sessions")),
  Loading: m(msg("Loading")),
  "List sessions": m(msg("List sessions")),
  Imported: m(msg("Imported")),
  Importing: m(msg("Importing")),
  Import: m(msg("Import")),
  Deleting: m(msg("Deleting")),
  Delete: m(msg("Delete")),
  "Load more": m(msg("Load more")),
  "Agent providers": m(msg("Agent providers")),
  "Configure non-secret routing. Headers are write-only.": m(
    msg("Configure non-secret routing. Headers are write-only."),
  ),
  "List providers": m(msg("List providers")),
  "Project for ACP providers": m(msg("Project for ACP providers")),
  Configured: m(msg("Configured")),
  Disable: m(msg("Disable")),
  "Finish later": m(msg("Finish later")),
  "Route added": m(msg("Route added")),
  "Environment connected": m(msg("Environment connected")),
  "Could not add backend": m(msg("Could not add backend")),
  "Backend added": m(msg("Backend added")),
  "The environment is saved and will reconnect on app startup.": m(
    msg("The environment is saved and will reconnect on app startup."),
  ),
  Host: m(msg("Host")),
  "Paste a full pairing URL here to fill both fields automatically.": m(
    msg("Paste a full pairing URL here to fill both fields automatically."),
  ),
  "Adding…": m(msg("Adding…")),
  "Add route": m(msg("Add route")),
  "Add environment": m(msg("Add environment")),
  "SSH host or alias": m(msg("SSH host or alias")),
  "Search hosts or type devbox": m(msg("Search hosts or type devbox")),
  "Loading hosts…": m(msg("Loading hosts…")),
  'No hosts match "': m(msg('No hosts match "')),
  Username: m(msg("Username")),
  Port: m(msg("Port")),
  "Add Environment": m(msg("Add Environment")),
  "Pair this machine again over another address, such as its Tailscale name. It joins the existing routes instead of adding a second machine.":
    m(
      msg(
        "Pair this machine again over another address, such as its Tailscale name. It joins the existing routes instead of adding a second machine.",
      ),
    ),
  "Pair another environment to this client.": m(msg("Pair another environment to this client.")),
  "Remote link": m(msg("Remote link")),
  "Enter a backend host and pairing code.": m(msg("Enter a backend host and pairing code.")),
  "Use local SSH config, agent, and tunnels for the backend.": m(
    msg("Use local SSH config, agent, and tunnels for the backend."),
  ),
  "Adding...": m(msg("Adding...")),
  "Add a CLIProxyAPI hub": m(msg("Add a CLIProxyAPI hub")),
  "Show the quota of every account the hub pools, next to the providers on": m(
    msg("Show the quota of every account the hub pools, next to the providers on"),
  ),
  ". The key stays on that server.": m(msg(". The key stays on that server.")),
  "Hub URL": m(msg("Hub URL")),
  "Label (optional)": m(msg("Label (optional)")),
  "Defaults to the hub's host name": m(msg("Defaults to the hub's host name")),
  "Add hub": m(msg("Add hub")),
  Unarchive: m(msg("Unarchive")),
  "Failed to unarchive thread": m(msg("Failed to unarchive thread")),
  "Failed to delete thread": m(msg("Failed to delete thread")),
  "Loading archived threads": m(msg("Loading archived threads")),
  "Could not load archived threads": m(msg("Could not load archived threads")),
  "No archived threads": m(msg("No archived threads")),
  "Checking connected environments.": m(msg("Checking connected environments.")),
  "Archived threads will appear here.": m(msg("Archived threads will appear here.")),
  "Archived thread action failed": m(msg("Archived thread action failed")),
  " · Created ": m(msg(" · Created ")),
  "Granted scopes": m(msg("Granted scopes")),
  "Could not copy hosted app link": m(msg("Could not copy hosted app link")),
  "Could not copy pairing URL": m(msg("Could not copy pairing URL")),
  "Could not copy pairing code": m(msg("Could not copy pairing code")),
  "Clipboard copy unavailable": m(msg("Clipboard copy unavailable")),
  "Showing the full value instead.": m(msg("Showing the full value instead.")),
  "Pairing link scopes": m(msg("Pairing link scopes")),
  "Create a new link to share from this client.": m(
    msg("Create a new link to share from this client."),
  ),
  "Copy the token and pair from another client using this backend's reachable host.": m(
    msg("Copy the token and pair from another client using this backend's reachable host."),
  ),
  Share: m(msg("Share")),
  "Copy code": m(msg("Copy code")),
  "Show link": m(msg("Show link")),
  "Show code": m(msg("Show code")),
  "Hosted app pairing link": m(msg("Hosted app pairing link")),
  "Pairing link": m(msg("Pairing link", { $context: "settingsCopy.ts" })),
  "Clipboard copy is unavailable here. Open or manually copy this hosted app link on the device you want to connect.":
    m(
      msg(
        "Clipboard copy is unavailable here. Open or manually copy this hosted app link on the device you want to connect.",
      ),
    ),
  "Clipboard copy is unavailable here. Open or manually copy this full pairing URL on the device you want to connect.":
    m(
      msg(
        "Clipboard copy is unavailable here. Open or manually copy this full pairing URL on the device you want to connect.",
      ),
    ),
  "Clipboard copy is unavailable here. Manually copy this code into another client.": m(
    msg("Clipboard copy is unavailable here. Manually copy this code into another client."),
  ),
  "Pairing link. Scan to open on another device": m(
    msg("Pairing link. Scan to open on another device"),
  ),
  "Revoking…": m(msg("Revoking…")),
  Revoke: m(msg("Revoke")),
  "Endpoint the pairing QR code and URL use": m(msg("Endpoint the pairing QR code and URL use")),
  "Reach this machine via": m(msg("Reach this machine via")),
  "Copy link": m(msg("Copy link")),
  "Copy code only": m(msg("Copy code only")),
  "No QR for this endpoint. Another device scanning a loopback link would dial itself; copy the URL for use on this machine instead.":
    m(
      msg(
        "No QR for this endpoint. Another device scanning a loopback link would dial itself; copy the URL for use on this machine instead.",
      ),
    ),
  "This device": m(msg("This device")),
  "Client scopes": m(msg("Client scopes")),
  "Could not create pairing URL": m(msg("Could not create pairing URL")),
  "Revoke others": m(msg("Revoke others")),
  "Create pairing link": m(msg("Create pairing link")),
  "Generate a one-time link that another device can use to pair with this backend as an authorized client.":
    m(
      msg(
        "Generate a one-time link that another device can use to pair with this backend as an authorized client.",
      ),
    ),
  "Client label (optional)": m(msg("Client label (optional)")),
  "e.g. Living room iPad": m(msg("e.g. Living room iPad")),
  "Limit what the paired client can do.": m(msg("Limit what the paired client can do.")),
  "Read only": m(msg("Read only")),
  Standard: m(msg("Standard")),
  "Select at least one permission.": m(msg("Select at least one permission.")),
  "This client can create or revoke access for other devices.": m(
    msg("This client can create or revoke access for other devices."),
  ),
  "Creating…": m(msg("Creating…")),
  "No pairing links or client sessions.": m(msg("No pairing links or client sessions.")),
  "Setup required": m(msg("Setup required")),
  "Set as default": m(msg("Set as default")),
  Hide: m(msg("Hide")),
  "Reachable at": m(msg("Reachable at")),
  "Pause when host is locked": m(msg("Pause when host is locked")),
  "Pause on host low power": m(msg("Pause on host low power")),
  "Pause on client low power": m(msg("Pause on client low power")),
  "Pause on battery": m(msg("Pause on battery")),
  "Background Activity": m(msg("Background Activity")),
  "Tune the shared power policy and the background intervals that feed it.": m(
    msg("Tune the shared power policy and the background intervals that feed it."),
  ),
  "Shared policy": m(msg("Shared policy")),
  "Controls whether background work may run after a subscribed interval fires.": m(
    msg("Controls whether background work may run after a subscribed interval fires."),
  ),
  "Shared background policy": m(msg("Shared background policy")),
  "Refresh remote branch status in the background.": m(
    msg("Refresh remote branch status in the background."),
  ),
  "Provider health interval": m(msg("Provider health interval")),
  "Refresh provider availability, versions, and auth state. Model catalog updates follow Provider update checks.":
    m(
      msg(
        "Refresh provider availability, versions, and auth state. Model catalog updates follow Provider update checks.",
      ),
    ),
  "Host power monitor": m(msg("Host power monitor")),
  "Poll host power state while clients are active.": m(
    msg("Poll host power state while clients are active."),
  ),
  "Idle host monitor": m(msg("Idle host monitor")),
  "Poll host power state when no foreground client is active.": m(
    msg("Poll host power state when no foreground client is active."),
  ),
  "This shared policy gates background work such as Git refreshes and provider health probes after their individual intervals elapse.":
    m(
      msg(
        "This shared policy gates background work such as Git refreshes and provider health probes after their individual intervals elapse.",
      ),
    ),
  "background activity": m(msg("background activity")),
  "Background activity profile": m(msg("Background activity profile")),
  "Configure advanced background activity": m(msg("Configure advanced background activity")),
  "Configure background activity": m(msg("Configure background activity")),
  Quit: m(msg("Quit")),
  "is open, so its cookies can’t be read yet. Quit it, then continue.": m(
    msg("is open, so its cookies can’t be read yet. Quit it, then continue."),
  ),
  "I’ve quit it": m(msg("I’ve quit it")),
  "Full Disk Access": m(msg("Full Disk Access")),
  "Access is still required. Quit and reopen Liverary if you just allowed it, then retry the import.":
    m(
      msg(
        "Access is still required. Quit and reopen Liverary if you just allowed it, then retry the import.",
      ),
    ),
  "If access doesn't update after you allow it, quit and reopen Liverary, then retry the import.":
    m(
      msg(
        "If access doesn't update after you allow it, quit and reopen Liverary, then retry the import.",
      ),
    ),
  From: m(msg("From", { $context: "settingsCopy.ts" })),
  Into: m(msg("Into")),
  "New profile": m(msg("New profile")),
  "Importing cookies": m(msg("Importing cookies")),
  "This may take a moment.": m(msg("This may take a moment.")),
  "Importing…": m(msg("Importing…", { $context: "settingsCopy.ts" })),
  Checking: m(msg("Checking")),
  "Checking Full Disk Access.": m(msg("Checking Full Disk Access.")),
  "Checking whether the browser has closed.": m(msg("Checking whether the browser has closed.")),
  "Checking access…": m(msg("Checking access…")),
  "No cookies found": m(msg("No cookies found")),
  Skipped: m(msg("Skipped")),
  Close: m(msg("Close")),
  "Try again": m(msg("Try again")),
  "Couldn't prepare the changes. Check Advanced for help.": m(
    msg("Couldn't prepare the changes. Check Advanced for help."),
  ),
  "Shortcut saved": m(msg("Shortcut saved")),
  "Couldn't save your shortcut. Review the changes and try again.": m(
    msg("Couldn't save your shortcut. Review the changes and try again."),
  ),
  Shortcut: m(msg("Shortcut")),
  "Press your shortcut. Esc cancels.": m(msg("Press your shortcut. Esc cancels.")),
  "Saved, but the shortcut needs attention. Check Advanced for help.": m(
    msg("Saved, but the shortcut needs attention. Check Advanced for help."),
  ),
  "Shortcut removed.": m(msg("Shortcut removed.")),
  "Review the change below to remove your shortcut.": m(
    msg("Review the change below to remove your shortcut."),
  ),
  "Review the change below, then save your shortcut.": m(
    msg("Review the change below, then save your shortcut."),
  ),
  "There's no capture shortcut to remove.": m(msg("There's no capture shortcut to remove.")),
  "This shortcut is already set up.": m(msg("This shortcut is already set up.")),
  "Shortcut changes": m(msg("Shortcut changes")),
  "Only these changes will be saved. We'll keep a backup.": m(
    msg("Only these changes will be saved. We'll keep a backup."),
  ),
  "Saving…": m(msg("Saving…")),
  "Save shortcut": m(msg("Save shortcut")),
  "Remove shortcut": m(msg("Remove shortcut")),
  "Allow Liverary to read your desktop settings. You'll review any changes here before saving.": m(
    msg(
      "Allow Liverary to read your desktop settings. You'll review any changes here before saving.",
    ),
  ),
  "Preparing changes…": m(msg("Preparing changes…")),
  "Review changes": m(msg("Review changes")),
  "Connecting to your desktop…": m(msg("Connecting to your desktop…")),
  "Restart Liverary to finish connecting your shortcut.": m(
    msg("Restart Liverary to finish connecting your shortcut."),
  ),
  Troubleshooting: m(msg("Troubleshooting")),
  "Settings file": m(msg("Settings file")),
  "Liverary also reads any files included by this file.": m(
    msg("Liverary also reads any files included by this file."),
  ),
  "Linked to": m(msg("Linked to")),
  ". The link will be kept.": m(msg(". The link will be kept.")),
  "Choose a different file…": m(msg("Choose a different file…")),
  "Remove shortcut…": m(msg("Remove shortcut…")),
  "Use your desktop's shortcut settings file.": m(
    msg("Use your desktop's shortcut settings file."),
  ),
  "A custom --config or NIRI_CONFIG can change its location.": m(
    msg("A custom --config or NIRI_CONFIG can change its location."),
  ),
  "On Omarchy, use your own bindings file, not its defaults.": m(
    msg("On Omarchy, use your own bindings file, not its defaults."),
  ),
  "Backup:": m(msg("Backup:")),
  "Manual setup": m(msg("Manual setup")),
  "Paste this inside binds { … } in your Niri config, then save.": m(
    msg("Paste this inside binds '{' … '}' in your Niri config, then save."),
  ),
  "Add this binding to your Hyprland config, then save.": m(
    msg("Add this binding to your Hyprland config, then save."),
  ),
  "Change the keys if needed.": m(msg("Change the keys if needed.")),
  Copied: m(msg("Copied")),
  "Copy shortcut": m(msg("Copy shortcut")),
  "Turn capture off in Liverary to stop it. Remove the shortcut from": m(
    msg("Turn capture off in Liverary to stop it. Remove the shortcut from"),
  ),
  "to free up the keys.": m(msg("to free up the keys.")),
  "I've added the shortcut": m(msg("I've added the shortcut")),
  "Manage usage": m(msg("Manage usage")),
  "Your ChatGPT plan is connected": m(msg("Your ChatGPT plan is connected")),
  "Eligible usage in Liverary uses your ChatGPT plan. Manage your shared usage and any credit settings in ChatGPT.":
    m(
      msg(
        "Eligible usage in Liverary uses your ChatGPT plan. Manage your shared usage and any credit settings in ChatGPT.",
      ),
    ),
  Details: m(msg("Details", { $context: "settingsCopy.ts" })),
  "Could not copy diagnostics": m(msg("Could not copy diagnostics")),
  "What to try": m(msg("What to try")),
  "More info": m(msg("More info")),
  "Retry now": m(msg("Retry now")),
  "Copy diagnostics": m(msg("Copy diagnostics")),
  Database: m(msg("Database")),
  "Reclaim freed database space": m(msg("Reclaim freed database space")),
  Dismiss: m(msg("Dismiss")),
  "Add device host": m(msg("Add device host")),
  "Edit device host": m(msg("Edit device host")),
  "Hosts on the same machine are skipped.": m(msg("Hosts on the same machine are skipped.")),
  "SSH target": m(msg("SSH target")),
  "user@host or SSH alias": m(msg("user@host or SSH alias")),
  "SSH options": m(msg("SSH options")),
  "Identity file": m(msg("Identity file")),
  "SSH config default": m(msg("SSH config default")),
  "Optional. Resolved separately on each environment.": m(
    msg("Optional. Resolved separately on each environment."),
  ),
  "Test connection": m(msg("Test connection")),
  "Already available locally": m(msg("Already available locally")),
  Failed: m(msg("Failed")),
  Connected: m(msg("Connected")),
  "Show error": m(msg("Show error")),
  "Save host": m(msg("Save host")),
  Starting: m(msg("Starting")),
  "Device host not saved": m(msg("Device host not saved")),
  "Connected or already available locally on each selected environment.": m(
    msg("Connected or already available locally on each selected environment."),
  ),
  Edit: m(msg("Edit")),
  More: m(msg("More")),
  "Simulators and emulators installed on each environment's own machine.": m(
    msg("Simulators and emulators installed on each environment's own machine."),
  ),
  "Simulators and emulators installed on this environment's machine.": m(
    msg("Simulators and emulators installed on this environment's machine."),
  ),
  "Testing connection": m(msg("Testing connection")),
  "Can't connect": m(msg("Can't connect")),
  "Add source": m(msg("Add source")),
  "Machine over SSH": m(msg("Machine over SSH")),
  "Simlock pool (alpha)": m(msg("Simlock pool (alpha)")),
  "available on some": m(msg("available on some")),
  available: m(msg("available")),
  "not available": m(msg("not available")),
  "Not available": m(msg("Not available")),
  "Not set up on this machine.": m(msg("Not set up on this machine.")),
  "Copied trace ID": m(msg("Copied trace ID")),
  "Copy trace ID": m(msg("Copy trace ID")),
  "Copy full trace ID": m(msg("Copy full trace ID")),
  Memory: m(msg("Memory")),
  Type: m(msg("Type")),
  Kill: m(msg("Kill")),
  "No live descendant processes found.": m(msg("No live descendant processes found.")),
  Avg: m(msg("Avg")),
  "%, peak": m(msg("%, peak")),
  "Process history period": m(msg("Process history period")),
  Process: m(msg("Process")),
  "CPU Time": m(msg("CPU Time")),
  Current: m(msg("Current", { $context: "settingsCopy.ts" })),
  Average: m(msg("Average")),
  Peak: m(msg("Peak")),
  "Max Mem": m(msg("Max Mem")),
  "Could not confirm signal": m(msg("Could not confirm signal")),
  "Process already exited": m(msg("Process already exited")),
  "The process is not a child of the Liverary server. It might already have exited.": m(
    msg("The process is not a child of the Liverary server. It might already have exited."),
  ),
  "Connect an environment to see diagnostics.": m(
    msg("Connect an environment to see diagnostics."),
  ),
  "Checking diagnostics access…": m(msg("Checking diagnostics access…")),
  "Live Processes": m(msg("Live Processes")),
  "Refresh process diagnostics": m(msg("Refresh process diagnostics")),
  "Child Processes": m(msg("Child Processes")),
  "Total CPU across live child processes of the current server process. The desktop shell and other parent processes are not included.":
    m(
      msg(
        "Total CPU across live child processes of the current server process. The desktop shell and other parent processes are not included.",
      ),
    ),
  "Total resident memory across live child processes of the current server process. The desktop shell and other parent processes are not included.":
    m(
      msg(
        "Total resident memory across live child processes of the current server process. The desktop shell and other parent processes are not included.",
      ),
    ),
  "Server PID": m(msg("Server PID")),
  "Loading live processes...": m(msg("Loading live processes...")),
  "Resource History": m(msg("Resource History")),
  "Refresh resource history": m(msg("Refresh resource history")),
  "Approximate active CPU time for the Liverary server root process and its descendants during the selected window. It grows only while sampled processes use CPU and older samples leave as the window moves.":
    m(
      msg(
        "Approximate active CPU time for the Liverary server root process and its descendants during the selected window. It grows only while sampled processes use CPU and older samples leave as the window moves.",
      ),
    ),
  Samples: m(msg("Samples")),
  "In-memory process samples retained by the server. The server samples only while diagnostics is open, and this resets when the server restarts.":
    m(
      msg(
        "In-memory process samples retained by the server. The server samples only while diagnostics is open, and this resets when the server restarts.",
      ),
    ),
  Interval: m(msg("Interval")),
  Processes: m(msg("Processes")),
  "Collecting process resource samples...": m(msg("Collecting process resource samples...")),
  "No process resource samples found for this window.": m(
    msg("No process resource samples found for this window."),
  ),
  "Trace Diagnostics": m(msg("Trace Diagnostics")),
  "Open logs folder": m(msg("Open logs folder")),
  "Refresh trace diagnostics": m(msg("Refresh trace diagnostics")),
  Spans: m(msg("Spans")),
  "Slow Spans": m(msg("Slow Spans")),
  "Spans at or above the configured slow-span threshold.": m(
    msg("Spans at or above the configured slow-span threshold."),
  ),
  "Parse Errors": m(msg("Parse Errors")),
  "Latest Failures": m(msg("Latest Failures")),
  "Loading failures...": m(msg("Loading failures...")),
  "No failed spans found.": m(msg("No failed spans found.")),
  "Most Common Failures": m(msg("Most Common Failures")),
  "Loading failure groups...": m(msg("Loading failure groups...")),
  "No repeated failures found.": m(msg("No repeated failures found.")),
  "Slowest Spans": m(msg("Slowest Spans")),
  "Loading slow spans...": m(msg("Loading slow spans...")),
  "No spans found.": m(msg("No spans found.")),
  "Span Logs": m(msg("Span Logs")),
  Time: m(msg("Time")),
  Level: m(msg("Level")),
  Span: m(msg("Span")),
  Message: m(msg("Message")),
  Trace: m(msg("Trace")),
  "Loading recent logs...": m(msg("Loading recent logs...")),
  "No warnings or errors found.": m(msg("No warnings or errors found.")),
  "Top Span Names": m(msg("Top Span Names")),
  "Loading span names...": m(msg("Loading span names...")),
  "Add Expo host": m(msg("Add Expo host")),
  "Edit Expo host": m(msg("Edit Expo host")),
  "The environment's server signs in to Expo and starts the sessions. Without a token here it uses EXPO_TOKEN, then its eas login.":
    m(
      msg(
        "The environment's server signs in to Expo and starts the sessions. Without a token here it uses EXPO_TOKEN, then its eas login.",
      ),
    ),
  "Clear access token": m(msg("Clear access token")),
  "Checking the Expo account…": m(msg("Checking the Expo account…")),
  "Check the Expo account before choosing a project.": m(
    msg("Check the Expo account before choosing a project."),
  ),
  "Check account": m(msg("Check account")),
  "Expo project": m(msg("Expo project")),
  "From the thread's project": m(msg("From the thread's project")),
  "Sessions bill the project's Expo account. \"From the thread's project\" reads extra.eas.projectId from the project's app config.":
    m(
      msg(
        "Sessions bill the project's Expo account. \"From the thread's project\" reads extra.eas.projectId from the project's app config.",
      ),
    ),
  "Expo Simulators needs a paid Expo account. A session runs for up to 115 minutes and stops early when it is idle for the idle minutes, so idle minutes must be less than session minutes.":
    m(
      msg(
        "Expo Simulators needs a paid Expo account. A session runs for up to 115 minutes and stops early when it is idle for the idle minutes, so idle minutes must be less than session minutes.",
      ),
    ),
  Icon: m(msg("Icon")),
  "In use": m(msg("In use")),
  "Remove route": m(msg("Remove route")),
  "Tab size for you and agents. Fill fits the panel; other sizes show the device toolbar.": m(
    msg("Tab size for you and agents. Fill fits the panel; other sizes show the device toolbar."),
  ),
  "default browser viewport": m(msg("default browser viewport")),
  "Fill panel": m(msg("Fill panel")),
  Responsive: m(msg("Responsive")),
  "Default viewport width": m(msg("Default viewport width")),
  "Default viewport height": m(msg("Default viewport height")),
  Rotate: m(msg("Rotate")),
  "Page zoom applied to new browser tabs.": m(msg("Page zoom applied to new browser tabs.")),
  "default browser zoom": m(msg("default browser zoom")),
  "The color scheme pages are told to prefer. System follows your OS setting.": m(
    msg("The color scheme pages are told to prefer. System follows your OS setting."),
  ),
  "default browser appearance": m(msg("default browser appearance")),
  "Show pressed keys and shortcuts in new recordings. Password fields are excluded.": m(
    msg("Show pressed keys and shortcuts in new recordings. Password fields are excluded."),
  ),
  "Highlight mouse presses and held buttons in new recordings.": m(
    msg("Highlight mouse presses and held buttons in new recordings."),
  ),
  "Maximum recording rate. 30 fps saves CPU and storage; 60 fps is smoother.": m(
    msg("Maximum recording rate. 30 fps saves CPU and storage; 60 fps is smoother."),
  ),
  "browser recording frame rate": m(msg("browser recording frame rate")),
  "Where links in the chat and terminal open. Hold ⌘ or Ctrl while clicking a link to open it in your default browser either way.":
    m(
      msg(
        "Where links in the chat and terminal open. Hold ⌘ or Ctrl while clicking a link to open it in your default browser either way.",
      ),
    ),
  "link target": m(msg("link target")),
  "What the address bar searches when you type something that isn't a URL.": m(
    msg("What the address bar searches when you type something that isn't a URL."),
  ),
  "search engine": m(msg("search engine")),
  "Use %s where the search terms go.": m(msg("Use %s where the search terms go.")),
  "Enter an http or https URL containing %s. Searches use DuckDuckGo until then.": m(
    msg("Enter an http or https URL containing %s. Searches use DuckDuckGo until then."),
  ),
  "Clicking a pull request link opens it in Liverary. Turn off to open pull request links like any other link, on your git host.":
    m(
      msg(
        "Clicking a pull request link opens it in Liverary. Turn off to open pull request links like any other link, on your git host.",
      ),
    ),
  "open pull requests in Liverary": m(msg("open pull requests in Liverary")),
  "Open pull requests in Liverary": m(msg("Open pull requests in Liverary")),
  "Device settings not saved on all environments": m(
    msg("Device settings not saved on all environments"),
  ),
  "Updating…": m(msg("Updating…")),
  "Check versions": m(msg("Check versions")),
  "Open simulators and emulators in the Device panel. Hub:": m(
    msg("Open simulators and emulators in the Device panel. Hub:"),
  ),
  "Device hub": m(msg("Device hub")),
  "New agent sessions can open and drive these devices. agent-device:": m(
    msg("New agent sessions can open and drive these devices. agent-device:"),
  ),
  "Agent device access": m(msg("Agent device access")),
  "Allow agents in this project to use the shared browser. Applies when the agent session next starts.":
    m(
      msg(
        "Allow agents in this project to use the shared browser. Applies when the agent session next starts.",
      ),
    ),
  "Allow agents to use the shared browser. Projects can override it.": m(
    msg("Allow agents to use the shared browser. Projects can override it."),
  ),
  "default browser access": m(msg("default browser access")),
  "Computer control": m(msg("Computer control")),
  "Agent computer access": m(msg("Agent computer access")),
  "Allow agents to inspect and control desktop apps in the local Windows environment. Applies when the agent session next starts. WSL and remote environments are not supported.":
    m(
      msg(
        "Allow agents to inspect and control desktop apps in the local Windows environment. Applies when the agent session next starts. WSL and remote environments are not supported.",
      ),
    ),
  "default computer access": m(msg("default computer access")),
  "Show the floating preview when an agent opens a browser or device unless the agent says otherwise.":
    m(
      msg(
        "Show the floating preview when an agent opens a browser or device unless the agent says otherwise.",
      ),
    ),
  "auto-show floating preview": m(msg("auto-show floating preview")),
  "You're not connected to a server yet.": m(msg("You're not connected to a server yet.")),
  "Profiles separate cookies and logins. Incognito data is cleared when the app closes.": m(
    msg("Profiles separate cookies and logins. Incognito data is cleared when the app closes."),
  ),
  "Add profile": m(msg("Add profile")),
  "Blank profile": m(msg("Blank profile")),
  "You’ve reached the profile limit": m(msg("You’ve reached the profile limit")),
  "Looking for browsers…": m(msg("Looking for browsers…")),
  "No supported browsers found": m(msg("No supported browsers found")),
  "Connect to an environment to import cookies": m(
    msg("Connect to an environment to import cookies"),
  ),
  "Clear cookies and cache": m(msg("Clear cookies and cache")),
  "Remove profile and data": m(msg("Remove profile and data")),
  "Connect to an environment to clear profile data": m(
    msg("Connect to an environment to clear profile data"),
  ),
  "Checking environments…": m(msg("Checking environments…")),
  "Its cookies and logins are deleted. Desktop tabs already open in this profile stay open until you close them; server browser tabs close now.":
    m(
      msg(
        "Its cookies and logins are deleted. Desktop tabs already open in this profile stay open until you close them; server browser tabs close now.",
      ),
    ),
  "Connect to an environment to remove this profile and its data.": m(
    msg("Connect to an environment to remove this profile and its data."),
  ),
  "Removing…": m(msg("Removing…")),
  "Remove profile": m(msg("Remove profile")),
  "You are signed out of its sites. Server browser tabs open in this profile close now.": m(
    msg("You are signed out of its sites. Server browser tabs open in this profile close now."),
  ),
  "Clear data": m(msg("Clear data")),
  "Could not open System Settings": m(msg("Could not open System Settings")),
  "Open Privacy & Security → Full Disk Access manually.": m(
    msg("Open Privacy & Security → Full Disk Access manually."),
  ),
  "Agent access": m(msg("Agent access")),
  Browsing: m(msg("Browsing")),
  Recordings: m(msg("Recordings")),
  Beta: m(msg("Beta")),
  "Group sidebar threads into project folders. Pinned threads stay on top, and Snoozed and Settled stay below the folders.":
    m(
      msg(
        "Group sidebar threads into project folders. Pinned threads stay on top, and Snoozed and Settled stay below the folders.",
      ),
    ),
  "Let agents here work on your other machines, and theirs here. Turn it on for each machine, then link them in":
    m(
      msg(
        "Let agents here work on your other machines, and theirs here. Turn it on for each machine, then link them in",
      ),
    ),
  "Let the Device panel lease simulators and emulators from your own": m(
    msg("Let the Device panel lease simulators and emulators from your own"),
  ),
  "pool, added in": m(msg("pool, added in")),
  ". An alpha that may change or break. Liverary never installs Simlock.": m(
    msg(". An alpha that may change or break. Liverary never installs Simlock."),
  ),
  "Simlock device hosts": m(msg("Simlock device hosts")),
  "What agents here may do there": m(msg("What agents here may do there")),
  "An agent never gets more access there than its own mode here. Below full access, it can change only threads this link started, not that machine's own threads, projects or settings.":
    m(
      msg(
        "An agent never gets more access there than its own mode here. Below full access, it can change only threads this link started, not that machine's own threads, projects or settings.",
      ),
    ),
  "unlink environment": m(msg("unlink environment")),
  "link environment": m(msg("link environment")),
  Linked: m(msg("Linked")),
  "Not connected": m(msg("Not connected")),
  "Another address…": m(msg("Another address…")),
  Prefer: m(msg("Prefer")),
  Normal: m(msg("Normal", { $context: "settingsCopy.ts" })),
  "Less often": m(msg("Less often")),
  "Manual only": m(msg("Manual only")),
  "Automatically balance load": m(msg("Automatically balance load")),
  "New threads in shared projects start on the machine with the most free CPU and memory, weighted by each machine's preference.":
    m(
      msg(
        "New threads in shared projects start on the machine with the most free CPU and memory, weighted by each machine's preference.",
      ),
    ),
  "The license manifest could not load.": m(msg("The license manifest could not load.")),
  "The license manifest took too long to load.": m(
    msg("The license manifest took too long to load."),
  ),
  "Project source": m(msg("Project source")),
  "Search open-source licenses": m(msg("Search open-source licenses")),
  "Search licenses": m(msg("Search licenses")),
  "Open-source notices are unavailable": m(msg("Open-source notices are unavailable")),
  "Third-party notices": m(msg("Third-party notices")),
  "No licenses match that search.": m(msg("No licenses match that search.")),
  "Loading open-source notices…": m(msg("Loading open-source notices…")),
  "Replay panel animation preview": m(msg("Replay panel animation preview")),
  "Send SIGINT": m(msg("Send SIGINT")),
  "Send SIGKILL": m(msg("Send SIGKILL")),
  Repositories: m(msg("Repositories")),
  "Choose project icon": m(msg("Choose project icon")),
  "Could not open image picker": m(msg("Could not open image picker")),
  "Search image files…": m(msg("Search image files…")),
  "Choose an icon, emoji, or monogram.": m(msg("Choose an icon, emoji, or monogram.")),
  "Icon type": m(msg("Icon type")),
  Icons: m(msg("Icons")),
  Emoji: m(msg("Emoji")),
  Monogram: m(msg("Monogram")),
  Color: m(msg("Color")),
  "Icon color": m(msg("Icon color")),
  "Search Lucide icons": m(msg("Search Lucide icons")),
  "Search all Lucide icons": m(msg("Search all Lucide icons")),
  "No icons found.": m(msg("No icons found.")),
  Letters: m(msg("Letters")),
  "One or two letters or numbers.": m(msg("One or two letters or numbers.")),
  "Or paste any emoji": m(msg("Or paste any emoji")),
  "Custom emoji": m(msg("Custom emoji")),
  "Paste an emoji": m(msg("Paste an emoji")),
  "Save icon": m(msg("Save icon")),
  "Show all environments": m(msg("Show all environments")),
  "Choose a project to manage its name, icon, checkouts and actions.": m(
    msg("Choose a project to manage its name, icon, checkouts and actions."),
  ),
  "Provider sign-in terminal": m(msg("Provider sign-in terminal")),
  "Read PRs": m(msg("Read PRs")),
  "Read and act": m(msg("Read and act")),
  "Machines you trust here can read PR data through each other's source control access. Enable both machines. Read and act may use broader permissions than the machine that owns them. This applies only to this device.":
    m(
      msg(
        "Machines you trust here can read PR data through each other's source control access. Enable both machines. Read and act may use broader permissions than the machine that owns them. This applies only to this device.",
      ),
    ),
  "Could not save pull request routing permission": m(
    msg("Could not save pull request routing permission"),
  ),
  "Waiting for sample": m(msg("Waiting for sample")),
  Updated: m(msg("Updated")),
  process: m(msg("Process")),
  processes: m(msg("Process")),
  Read: m(msg("Read")),
  Write: m(msg("Write")),
  "Available when this page runs inside the desktop app.": m(
    msg("Available when this page runs inside the desktop app."),
  ),
  "Desktop only": m(msg("Desktop only")),
  "Resource history period": m(msg("Resource history period")),
  "CPU average": m(msg("CPU average")),
  "I/O reads": m(msg("I/O reads")),
  "I/O writes": m(msg("I/O writes")),
  "CPU avg": m(msg("CPU avg")),
  "CPU peak": m(msg("CPU peak")),
  Category: m(msg("Category")),
  "Read/s": m(msg("Read/s")),
  "Write/s": m(msg("Write/s")),
  "Read Total": m(msg("Read Total")),
  "Write Total": m(msg("Write Total")),
  "Waiting for the native process monitor.": m(msg("Waiting for the native process monitor.")),
  "Peak CPU": m(msg("Peak CPU")),
  "Peak Mem": m(msg("Peak Mem")),
  "No retained process samples in this window.": m(
    msg("No retained process samples in this window."),
  ),
  Component: m(msg("Component")),
  Operation: m(msg("Operation")),
  "Logical Read": m(msg("Logical Read")),
  "Logical Write": m(msg("Logical Write")),
  Count: m(msg("Count")),
  "No instrumented application I/O has been recorded yet.": m(
    msg("No instrumented application I/O has been recorded yet."),
  ),
  "Could not restart resource monitor": m(msg("Could not restart resource monitor")),
  "The resource monitor retry failed.": m(msg("The resource monitor retry failed.")),
  "Resource monitor": m(msg("Resource monitor")),
  Native: m(msg("Native")),
  "Refresh resource telemetry": m(msg("Refresh resource telemetry")),
  "Refresh telemetry snapshot": m(msg("Refresh telemetry snapshot")),
  "Liverary system footprint": m(msg("Liverary system footprint")),
  "Live native counters for the server, providers, terminals, desktop processes, and the monitor itself.":
    m(
      msg(
        "Live native counters for the server, providers, terminals, desktop processes, and the monitor itself.",
      ),
    ),
  "Current CPU": m(msg("Current CPU")),
  "Resident memory": m(msg("Resident memory")),
  "Process count": m(msg("Process count")),
  "Read throughput": m(msg("Read throughput")),
  "Write throughput": m(msg("Write throughput")),
  "CPU speed limit": m(msg("CPU speed limit")),
  "Backend + agents": m(msg("Backend + agents")),
  Desktop: m(msg("Desktop")),
  "Monitor overhead": m(msg("Monitor overhead")),
  "Host & collection": m(msg("Host & collection")),
  "Retry monitor": m(msg("Retry monitor")),
  "Host state": m(msg("Host state")),
  "Power source": m(msg("Power source")),
  "Low power mode": m(msg("Low power mode")),
  Idle: m(msg("Idle", { $context: "settingsCopy.ts" })),
  Session: m(msg("Session")),
  Thermal: m(msg("Thermal")),
  "Desktop host signals not connected": m(msg("Desktop host signals not connected")),
  "Power, idle, lock, and thermal state are supplied by the desktop host. Process telemetry remains fully active in this browser session.":
    m(
      msg(
        "Power, idle, lock, and thermal state are supplied by the desktop host. Process telemetry remains fully active in this browser session.",
      ),
    ),
  "Collection health": m(msg("Collection health")),
  "Native process monitor": m(msg("Native process monitor")),
  "Electron main process": m(msg("Electron main process")),
  "Collection time": m(msg("Collection time")),
  "Process scan": m(msg("Process scan")),
  Inaccessible: m(msg("Inaccessible")),
  Sidecar: m(msg("Sidecar")),
  Restarts: m(msg("Restarts")),
  "Waiting for collector health.": m(msg("Waiting for collector health.")),
  "Resource timeline": m(msg("Resource timeline")),
  "Live process tree": m(msg("Live process tree")),
  "Identity:": m(msg("Identity:")),
  "PID + start time": m(msg("PID + start time")),
  "Instrumented application I/O": m(msg("Instrumented application I/O")),
  "Logical bytes by operation": m(msg("Logical bytes by operation")),
  "Native counters identify which process is reading or writing. These application-level counters identify known Liverary operations so process spikes can be correlated with specific persistence and logging paths.":
    m(
      msg(
        "Native counters identify which process is reading or writing. These application-level counters identify known Liverary operations so process spikes can be correlated with specific persistence and logging paths.",
      ),
    ),
  "Could not copy trace ID": m(msg("Could not copy trace ID")),
  Routes: m(msg("Routes")),
  Update: m(msg("Update")),
  "Client not supported": m(msg("Client not supported")),
  "Switch off": m(msg("Switch off")),
  "Switch on": m(msg("Switch on")),
  "Hide routes": m(msg("Hide routes")),
  "Copy MCP URL": m(msg("Copy MCP URL")),
  "Remove from this device…": m(msg("Remove from this device…")),
  "Agent activity enabled": m(msg("Agent activity enabled")),
  "Agent activity disabled": m(msg("Agent activity disabled")),
  "To edit these settings, pair this connection with both View relay and Manage relay permissions.":
    m(
      msg(
        "To edit these settings, pair this connection with both View relay and Manage relay permissions.",
      ),
    ),
  "No saved remote environments": m(msg("No saved remote environments")),
  "Click “Add environment” to pair another environment.": m(
    msg("Click “Add environment” to pair another environment."),
  ),
  "Invalid age limit": m(msg("Invalid age limit")),
  "Invalid webhook settings": m(msg("Invalid webhook settings")),
  "Coalesce window must be whole seconds from 10 to 3600.": m(
    msg("Coalesce window must be whole seconds from 10 to 3600."),
  ),
  Filters: m(msg("Filters")),
  "Run only when every filter matches. Other requests are logged as filtered. Separate “is one of” values with commas; a value can't contain a comma.":
    m(
      msg(
        "Run only when every filter matches. Other requests are logged as filtered. Separate “is one of” values with commas; a value can't contain a comma.",
      ),
    ),
  "Add filter": m(msg("Add filter")),
  "New task": m(msg("New task")),
  "Unavailable selection": m(msg("Unavailable selection")),
  "No environments available": m(msg("No environments available")),
  "Connect an environment to manage scheduled tasks.": m(
    msg("Connect an environment to manage scheduled tasks."),
  ),
  "Task unavailable": m(msg("Task unavailable")),
  "No scheduled tasks": m(msg("No scheduled tasks")),
  "No tasks match this environment and project selection.": m(
    msg("No tasks match this environment and project selection."),
  ),
  "Environment disconnected": m(msg("Environment disconnected", { $context: "settingsCopy.ts" })),
  "Could not load scheduled tasks": m(msg("Could not load scheduled tasks")),
  "Loading scheduled tasks…": m(msg("Loading scheduled tasks…")),
  "scheduled task enabled": m(msg("scheduled task enabled")),
  "scheduled task run now": m(msg("scheduled task run now")),
  "scheduled task delete": m(msg("scheduled task delete")),
  "Could not update scheduled task": m(msg("Could not update scheduled task")),
  Paused: m(msg("Paused")),
  Listening: m(msg("Listening")),
  "Next run": m(msg("Next run")),
  "This status tracks request delivery. Check the conversation for the agent's result.": m(
    msg("This status tracks request delivery. Check the conversation for the agent's result."),
  ),
  "This date and time use this device's time zone.": m(
    msg("This date and time use this device's time zone."),
  ),
  "Times and weekdays follow the environment's time zone. Runs more than 10 minutes late are skipped.":
    m(
      msg(
        "Times and weekdays follow the environment's time zone. Runs more than 10 minutes late are skipped.",
      ),
    ),
  "Not scheduled": m(msg("Not scheduled")),
  Deliveries: m(msg("Deliveries")),
  "Run now": m(msg("Run now")),
  "Deliveries ·": m(msg("Deliveries ·")),
  "Recent requests to this task's webhook URL.": m(
    msg("Recent requests to this task's webhook URL."),
  ),
  "Loading delivery…": m(msg("Loading delivery…")),
  "Signature verified": m(msg("Signature verified")),
  "Scheduled run": m(msg("Scheduled run")),
  "Request prompt": m(msg("Request prompt")),
  "Run scheduled when the window closes; no run started yet.": m(
    msg("Run scheduled when the window closes; no run started yet."),
  ),
  "No prompt is recorded for this request.": m(msg("No prompt is recorded for this request.")),
  "Empty placeholders:": m(msg("Empty placeholders:")),
  Headers: m(msg("Headers")),
  Query: m(msg("Query")),
  "Body (truncated)": m(msg("Body (truncated)")),
  Body: m(msg("Body")),
  "(empty)": m(msg("(empty)")),
  "Loading deliveries…": m(msg("Loading deliveries…")),
  "No requests yet.": m(msg("No requests yet.")),
  "scheduled task rotate webhook token": m(msg("scheduled task rotate webhook token")),
  "The URL appears after you save.": m(msg("The URL appears after you save.")),
  "Could not rotate webhook URL": m(msg("Could not rotate webhook URL")),
  "Webhook URL": m(msg("Webhook URL")),
  Copy: m(msg("Copy")),
  Destination: m(msg("Destination")),
  "Each run starts a new thread with the workspace and model below.": m(
    msg("Each run starts a new thread with the workspace and model below."),
  ),
  "Each run continues this conversation, in its workspace and with its current model.": m(
    msg("Each run continues this conversation, in its workspace and with its current model."),
  ),
  "scheduled task upsert": m(msg("scheduled task upsert")),
  "Edit task": m(msg("Edit task")),
  "Reconnect this environment before saving.": m(msg("Reconnect this environment before saving.")),
  "Runs on": m(msg("Runs on")),
  "This scheduled task no longer exists.": m(msg("This scheduled task no longer exists.")),
  "e.g. Check for Sentry issues": m(msg("e.g. Check for Sentry issues")),
  "Select a project": m(msg("Select a project")),
  "Create a new worktree": m(msg("Create a new worktree")),
  "Use the project checkout": m(msg("Use the project checkout")),
  "Use a specific checkout": m(msg("Use a specific checkout")),
  "Base branch": m(msg("Base branch")),
  "Checkout path": m(msg("Checkout path")),
  Prompt: m(msg("Prompt")),
  "What should the agent do each time this runs?": m(
    msg("What should the agent do each time this runs?"),
  ),
  "This task uses a legacy interval below one minute. Saving updates it to at least one minute.": m(
    msg(
      "This task uses a legacy interval below one minute. Saving updates it to at least one minute.",
    ),
  ),
  Schedule: m(msg("Schedule")),
  "Schedule type": m(msg("Schedule type", { $context: "settingsCopy.ts" })),
  "At a time": m(msg("At a time")),
  "Every interval": m(msg("Every interval")),
  "Each request runs the prompt. Use {{body.path}}, {{headers.name}}, {{query.name}}, {{body}} or {{request}} in the prompt; only what it names reaches the agent.":
    m(
      msg(
        "Each request runs the prompt. Use '{''{'body.path'}''}', '{''{'headers.name'}''}', '{''{'query.name'}''}', '{''{'body'}''}' or '{''{'request'}''}' in the prompt; only what it names reaches the agent.",
      ),
    ),
  "Skip requests older than": m(msg("Skip requests older than")),
  "Run every request": m(msg("Run every request")),
  "Coalesce key": m(msg("Coalesce key")),
  "Coalesce window": m(msg("Coalesce window")),
  "Require signature": m(msg("Require signature")),
  "Reject requests without a valid HMAC-SHA256 signature of the body.": m(
    msg("Reject requests without a valid HMAC-SHA256 signature of the body."),
  ),
  Header: m(msg("Header")),
  Prefix: m(msg("Prefix")),
  Encoding: m(msg("Encoding")),
  Secret: m(msg("Secret")),
  Unchanged: m(msg("Unchanged")),
  "Shared secret": m(msg("Shared secret")),
  "Run at": m(msg("Run at")),
  "Days to run": m(msg("Days to run")),
  "Run every": m(msg("Run every")),
  minutes: m(msg("Minutes")),
  Enabled: m(msg("Enabled")),
  "Disabled tasks stay saved but do not run.": m(msg("Disabled tasks stay saved but do not run.")),
  "Save task": m(msg("Save task")),
  "Create task": m(msg("Create task")),
  "This environment does not support this setting. Update Liverary on it.": m(
    msg("This environment does not support this setting. Update Liverary on it."),
  ),
  "The save failed. Try reconnecting and saving again.": m(
    msg("The save failed. Try reconnecting and saving again.", { $context: "settingsCopy.ts" }),
  ),
  "Add a 1Password provider": m(msg("Add a 1Password provider")),
  "Provider variables on": m(msg("Provider variables on")),
  "can read values from it by name. Values are read with the op CLI on that server when a provider starts.":
    m(
      msg(
        "can read values from it by name. Values are read with the op CLI on that server when a provider starts.",
      ),
    ),
  Personal: m(msg("Personal", { $context: "settingsCopy.ts" })),
  "The account shorthand, sign-in address without https://, or ID that op account list shows.": m(
    msg(
      "The account shorthand, sign-in address without https://, or ID that op account list shows.",
    ),
  ),
  "Save changes": m(msg("Save changes")),
  Value: m(msg("Value")),
  "Update Liverary on": m(msg("Update Liverary on")),
  "to manage its secret providers.": m(msg("to manage its secret providers.")),
  "Connect an environment to manage the secret providers its provider variables read from.": m(
    msg("Connect an environment to manage the secret providers its provider variables read from."),
  ),
  "No secret providers configured.": m(msg("No secret providers configured.")),
  "Add a 1Password account, then pick it as the source of a provider variable.": m(
    msg("Add a 1Password account, then pick it as the source of a provider variable."),
  ),
  "Remove provider": m(msg("Remove provider")),
  "These permissions apply to your active route. Other routes may have different permissions.": m(
    msg(
      "These permissions apply to your active route. Other routes may have different permissions.",
    ),
  ),
  "These permissions apply to this client’s current connection.": m(
    msg("These permissions apply to this client’s current connection."),
  ),
  Allowed: m(msg("Allowed")),
  "Not granted": m(msg("Not granted")),
  "Terminal font preview": m(msg("Terminal font preview")),
  "Red & green": m(msg("Red & green")),
  "Add Simlock host": m(msg("Add Simlock host")),
  "Edit Simlock host": m(msg("Edit Simlock host")),
  "Each selected environment's server leases devices from your Simlock gateway with its own agent token, and releases them when they close.":
    m(
      msg(
        "Each selected environment's server leases devices from your Simlock gateway with its own agent token, and releases them when they close.",
      ),
    ),
  "The environment's server leases devices from your Simlock gateway and releases them when they close.":
    m(
      msg(
        "The environment's server leases devices from your Simlock gateway and releases them when they close.",
      ),
    ),
  "Gateway URL": m(msg("Gateway URL")),
  "Agent token": m(msg("Agent token")),
  "A lease ends after the lease minutes even while in use.": m(
    msg("A lease ends after the lease minutes even while in use."),
  ),
  "Clear agent token": m(msg("Clear agent token")),
  "Could not check this shortcut.": m(msg("Could not check this shortcut.")),
  "Updating capture settings…": m(msg("Updating capture settings…")),
  "Enable snapshots": m(msg("Enable snapshots")),
  "Include text and controls when the app makes them available.": m(
    msg("Include text and controls when the app makes them available."),
  ),
  "Include app text in snapshots": m(msg("Include app text in snapshots")),
  "Choose a window to capture from any app.": m(msg("Choose a window to capture from any app.")),
  "Capture the window you're using without switching apps.": m(
    msg("Capture the window you're using without switching apps."),
  ),
  "Change shortcut": m(msg("Change shortcut")),
  "Shortcut permissions": m(msg("Shortcut permissions")),
  "Choose the sound played when capture starts.": m(
    msg("Choose the sound played when capture starts."),
  ),
  Whoosh: m(msg("Whoosh")),
  "(Default)": m(msg("(Default)")),
  Click: m(msg("Click")),
  "Play Whoosh": m(msg("Play Whoosh")),
  "Play Click": m(msg("Play Click")),
  "Show a gentle cue on the captured window.": m(msg("Show a gentle cue on the captured window.")),
  "Flash captured window": m(msg("Flash captured window")),
  "Animate captured windows into your draft.": m(msg("Animate captured windows into your draft.")),
  "Animate snapshots": m(msg("Animate snapshots")),
  Access: m(msg("Access")),
  "Install the extension": m(msg("Install the extension")),
  "The Liverary GNOME extension lets you capture other windows and bring them into your draft. Sign out once after installing.":
    m(
      msg(
        "The Liverary GNOME extension lets you capture other windows and bring them into your draft. Sign out once after installing.",
      ),
    ),
  "Extension installed": m(msg("Extension installed")),
  "Save your work, then sign out and back in. Your setup will be waiting here.": m(
    msg("Save your work, then sign out and back in. Your setup will be waiting here."),
  ),
  "Update the extension": m(msg("Update the extension")),
  "Install the update, then sign out and back in.": m(
    msg("Install the update, then sign out and back in."),
  ),
  "Allow GNOME extensions": m(msg("Allow GNOME extensions")),
  "Open GNOME Extensions and turn on extensions, then check again.": m(
    msg("Open GNOME Extensions and turn on extensions, then check again."),
  ),
  "Enable the extension": m(msg("Enable the extension")),
  "Enable Liverary SnapShots to start capturing windows.": m(
    msg("Enable Liverary SnapShots to start capturing windows."),
  ),
  "Capture is ready": m(msg("Capture is ready")),
  "Next, choose your shortcut.": m(msg("Next, choose your shortcut.")),
  "Automatic capture isn't available": m(msg("Automatic capture isn't available")),
  "Use Take snapshot from the command palette to choose a window.": m(
    msg("Use Take snapshot from the command palette to choose a window."),
  ),
  "Couldn't set up the extension": m(msg("Couldn't set up the extension")),
  "Check Liverary SnapShots in GNOME Extensions, then try again.": m(
    msg("Check Liverary SnapShots in GNOME Extensions, then try again."),
  ),
  "Let's try that again": m(msg("Let's try that again")),
  "Couldn't check snapshots. Try again to continue.": m(
    msg("Couldn't check snapshots. Try again to continue."),
  ),
  "Check capture access": m(msg("Check capture access")),
  "The extension isn't ready yet. Try again in a moment.": m(
    msg("The extension isn't ready yet. Try again in a moment."),
  ),
  "Let's fix capture access": m(msg("Let's fix capture access")),
  "Try reinstalling the capture helper, then check again.": m(
    msg("Try reinstalling the capture helper, then check again."),
  ),
  "Update the capture helper": m(msg("Update the capture helper")),
  "Allow snapshots": m(msg("Allow snapshots")),
  "Liverary's capture helper lets you capture other apps and return to your draft. It's included with Liverary.":
    m(
      msg(
        "Liverary's capture helper lets you capture other apps and return to your draft. It's included with Liverary.",
      ),
    ),
  "Choose a window each time": m(msg("Choose a window each time")),
  "Your desktop doesn't support automatic capture. You'll choose the window to capture instead.": m(
    msg(
      "Your desktop doesn't support automatic capture. You'll choose the window to capture instead.",
    ),
  ),
  "Your desktop may ask for permission when you first capture.": m(
    msg("Your desktop may ask for permission when you first capture."),
  ),
  "Test a snapshot of the current window. If macOS asks to bypass its window picker, choose Allow. The test image is discarded.":
    m(
      msg(
        "Test a snapshot of the current window. If macOS asks to bypass its window picker, choose Allow. The test image is discarded.",
      ),
    ),
  "Allow each permission, then continue.": m(msg("Allow each permission, then continue.")),
  "Allow access when prompted to start capturing windows.": m(
    msg("Allow access when prompted to start capturing windows."),
  ),
  "Set up snapshots": m(msg("Set up snapshots")),
  "Screen Recording": m(msg("Screen Recording")),
  "Capture the window you're using.": m(msg("Capture the window you're using.")),
  Accessibility: m(msg("Accessibility")),
  "Include text and controls from the captured app.": m(
    msg("Include text and controls from the captured app."),
  ),
  "Optional. Include text and controls from the captured app.": m(
    msg("Optional. Include text and controls from the captured app."),
  ),
  "Reinstall helper": m(msg("Reinstall helper")),
  "Capture needs attention. Go back to check access.": m(
    msg("Capture needs attention. Go back to check access."),
  ),
  "Couldn't finish this step. Try again or check Advanced for help.": m(
    msg("Couldn't finish this step. Try again or check Advanced for help."),
  ),
  "Included with Liverary. No download needed.": m(
    msg("Included with Liverary. No download needed."),
  ),
  "Disable extension": m(msg("Disable extension")),
  "Remove capture helper": m(msg("Remove capture helper")),
  "Installing…": m(msg("Installing…")),
  "Check again": m(msg("Check again")),
  "Update helper": m(msg("Update helper")),
  "Install helper": m(msg("Install helper")),
  "Enabling…": m(msg("Enabling…")),
  "Working…": m(msg("Working…")),
  "Update extension": m(msg("Update extension")),
  "Install extension": m(msg("Install extension")),
  "Enable extension": m(msg("Enable extension")),
  "Test capture and continue": m(msg("Test capture and continue")),
  "Allow capture": m(msg("Allow capture")),
  "Save and finish": m(msg("Save and finish")),
  "Choices in every snooze menu, listed soonest first. Weekdays mean the next one after today.": m(
    msg(
      "Choices in every snooze menu, listed soonest first. Weekdays mean the next one after today.",
    ),
  ),
  "snooze options": m(msg("snooze options")),
  "Menus offer only Custom…": m(msg("Menus offer only Custom…")),
  "Add option": m(msg("Add option")),
  "Up to": m(msg("Up to")),
  options: m(msg("options")),
  at: m(msg("Time")),
  Decrease: m(msg("Decrease")),
  Amount: m(msg("Amount")),
  Increase: m(msg("Increase")),
  Unit: m(msg("Unit")),
  "Hidden account": m(msg("Hidden account")),
  "Sign in with": m(msg("Sign in with")),
  "on the server host, then rescan to choose accounts here.": m(
    msg("on the server host, then rescan to choose accounts here."),
  ),
  "Choose which": m(msg("Choose which")),
  "login each": m(msg("login each")),
  "host uses, or turn a host off.": m(msg("host uses, or turn a host off.")),
  Active: m(msg("Active")),
  account: m(msg("account")),
  "The chosen login is no longer signed in, so the active": m(
    msg("The chosen login is no longer signed in, so the active"),
  ),
  "login is used.": m(msg("login is used.")),
  "Use active login": m(msg("Use active login")),
  "can't be used:": m(msg("can't be used:")),
  "is set on the server, so it overrides the account chosen here until it is unset.": m(
    msg("is set on the server, so it overrides the account chosen here until it is unset."),
  ),
  "Sign in with GitHub": m(msg("Sign in with GitHub")),
  "Copy code & open GitHub": m(msg("Copy code & open GitHub")),
  "Waiting for approval · code expires at": m(msg("Waiting for approval · code expires at")),
  "Reaches repositories in accounts and organizations that installed the app.": m(
    msg("Reaches repositories in accounts and organizations that installed the app."),
  ),
  "Install on an organization": m(msg("Install on an organization")),
  "Manage on GitHub": m(msg("Manage on GitHub")),
  "Status unknown": m(msg("Status unknown")),
  "Support for": m(msg("Support for")),
  "is coming soon.": m(msg("is coming soon.")),
  "Not available on this server:": m(msg("Not available on this server:")),
  as: m(msg("as")),
  "Available.": m(msg("Available.")),
  "is not authenticated on this server. Sign in or configure credentials using the": m(
    msg("is not authenticated on this server. Sign in or configure credentials using the"),
  ),
  "tool on the server host to enable change request features.": m(
    msg("tool on the server host to enable change request features."),
  ),
  "Could not verify": m(msg("Could not verify")),
  "Coming Soon": m(msg("Coming Soon")),
  "Server environment": m(msg("Server environment")),
  "Could not scan the server environment": m(msg("Could not scan the server environment")),
  "Nothing detected yet": m(msg("Nothing detected yet")),
  "Install Git on the server, add optional hosting integrations or credentials your workspace needs, then rescan.":
    m(
      msg(
        "Install Git on the server, add optional hosting integrations or credentials your workspace needs, then rescan.",
      ),
    ),
  Scan: m(msg("Scan")),
  "Or use your own credentials": m(msg("Or use your own credentials")),
  "Rescan server environment": m(msg("Rescan server environment")),
  "Rescan Git and hosting integrations": m(msg("Rescan Git and hosting integrations")),
  "Connect an environment to inspect its version control tools and hosting integrations.": m(
    msg("Connect an environment to inspect its version control tools and hosting integrations."),
  ),
  "Source control providers": m(msg("Source control providers")),
  "A token saved here is used before": m(msg("A token saved here is used before")),
  "and the": m(msg("and the")),
  "login, so": m(msg("login, so")),
  "works without the": m(msg("works without the")),
  ". Give it": m(msg(". Give it")),
  "Create a token": m(msg("Create a token")),
  "In each project, matches recent change descriptions and change request titles.": m(
    msg("In each project, matches recent change descriptions and change request titles."),
  ),
  "Use Conventional Commit prefixes and keep change request text concise.": m(
    msg("Use Conventional Commit prefixes and keep change request text concise."),
  ),
  "Use your instructions for change descriptions and change requests in every project.": m(
    msg("Use your instructions for change descriptions and change requests in every project."),
  ),
  "Writing & review": m(msg("Writing & review")),
  "source control writing style": m(msg("source control writing style")),
  "Custom source control instructions for all selected environments": m(
    msg("Custom source control instructions for all selected environments"),
  ),
  "Write the instructions each selected environment should use.": m(
    msg("Write the instructions each selected environment should use."),
  ),
  "Apply instructions to all": m(msg("Apply instructions to all")),
  "Write custom instructions for all": m(msg("Write custom instructions for all")),
  "Keep titles concise. Use short bullet points in descriptions.": m(
    msg("Keep titles concise. Use short bullet points in descriptions."),
  ),
  "Custom source control writing instructions": m(
    msg("Custom source control writing instructions"),
  ),
  "Review guides": m(msg("Review guides")),
  "Connect an environment to choose its review guide model.": m(
    msg("Connect an environment to choose its review guide model."),
  ),
  "Review guide model not saved": m(msg("Review guide model not saved")),
  "Use a separate review guide model": m(msg("Use a separate review guide model")),
  "Your preferences for review guides: what to show first, dwell on, or skip. The guide's format and coverage stay the same.":
    m(
      msg(
        "Your preferences for review guides: what to show first, dwell on, or skip. The guide's format and coverage stay the same.",
      ),
    ),
  "review guide instructions": m(msg("review guide instructions")),
  "Show service interfaces before implementations. Skip test files unless they change behavior. Keep summaries to two sentences.":
    m(
      msg(
        "Show service interfaces before implementations. Skip test files unless they change behavior. Keep summaries to two sentences.",
      ),
    ),
  "Use the repository's template for change request descriptions when available.": m(
    msg("Use the repository's template for change request descriptions when available."),
  ),
  "change request templates": m(msg("change request templates")),
  "Connect an environment to choose its source control writer model.": m(
    msg("Connect an environment to choose its source control writer model."),
  ),
  "Source control writer model not saved": m(msg("Source control writer model not saved")),
  "Use a separate source control writer model": m(
    msg("Use a separate source control writer model"),
  ),
  Traces: m(msg("Traces")),
  Metrics: m(msg("Metrics")),
  Logs: m(msg("Logs")),
  "Not checked": m(msg("Not checked")),
  "Timed out": m(msg("Timed out")),
  Unreachable: m(msg("Unreachable")),
  "Choose one environment to configure its telemetry exports.": m(
    msg("Choose one environment to configure its telemetry exports."),
  ),
  "Send traces, metrics, and logs to an OTLP HTTP receiver. Restart the server to apply. Environment variables override these settings.":
    m(
      msg(
        "Send traces, metrics, and logs to an OTLP HTTP receiver. Restart the server to apply. Environment variables override these settings.",
      ),
    ),
  "This connection lacks permission to change settings on": m(
    msg("This connection lacks permission to change settings on"),
  ),
  endpoint: m(msg("endpoint")),
  "Enter an HTTP or HTTPS endpoint, or leave empty to disable export.": m(
    msg("Enter an HTTP or HTTPS endpoint, or leave empty to disable export."),
  ),
  Test: m(msg("Test")),
  "Running:": m(msg("Running:")),
  from: m(msg("from")),
  Discard: m(msg("Discard")),
  "Choose a color": m(msg("Choose a color")),
  "Could not save your theme": m(msg("Could not save your theme")),
  "Browser storage is unavailable, so the change was not kept.": m(
    msg("Browser storage is unavailable, so the change was not kept."),
  ),
  Foundation: m(msg("Foundation")),
  Background: m(msg("Background")),
  Surface: m(msg("Surface")),
  "Raised surface": m(msg("Raised surface")),
  Overlay: m(msg("Overlay")),
  Text: m(msg("Text")),
  "Muted text": m(msg("Muted text")),
  Border: m(msg("Border")),
  Input: m(msg("Input")),
  "Brand & content": m(msg("Brand & content")),
  "Subtle surface": m(msg("Subtle surface")),
  "Highlight surface": m(msg("Highlight surface")),
  Accent: m(msg("Accent")),
  Action: m(msg("Action")),
  "Message surface": m(msg("Message surface")),
  "Code surface": m(msg("Code surface")),
  "Search matches": m(msg("Search matches")),
  "Current match": m(msg("Current match")),
  Context: m(msg("Context", { $context: "settingsCopy.ts" })),
  "Sidebar background": m(msg("Sidebar background")),
  "Sidebar controls": m(msg("Sidebar controls")),
  "Sidebar selection": m(msg("Sidebar selection")),
  "Terminal background": m(msg("Terminal background")),
  Error: m(msg("Error")),
  Warning: m(msg("Warning")),
  "Theme name": m(msg("Theme name")),
  "e.g. Aurora": m(msg("e.g. Aurora")),
  "Theme appearance": m(msg("Theme appearance")),
  Colors: m(msg("Colors")),
  "Two colors, rest derived": m(msg("Two colors, rest derived")),
  "Filter colors": m(msg("Filter colors")),
  "Use advanced theme colors": m(msg("Use advanced theme colors")),
  "No matches.": m(msg("No matches.")),
  "Select an element · Esc to cancel": m(msg("Select an element · Esc to cancel")),
  "Select a color below": m(msg("Select a color below")),
  "Cancel inspecting app colors": m(msg("Cancel inspecting app colors")),
  "Inspect app colors": m(msg("Inspect app colors")),
  Inspect: m(msg("Inspect")),
  "Cancel and clear the selection": m(msg("Cancel and clear the selection")),
  "Pick a color from the app": m(msg("Pick a color from the app")),
  "Expand the theme editor": m(msg("Expand the theme editor")),
  "Minimize the theme editor": m(msg("Minimize the theme editor")),
  "Close the theme editor": m(msg("Close the theme editor")),
  "Theme JSON": m(msg("Theme JSON")),
  "Add a theme": m(msg("Add a theme")),
  "or import a file": m(msg("or import a file")),
  "Reading…": m(msg("Reading…")),
  "Already installed": m(msg("Already installed")),
  "Update existing": m(msg("Update existing")),
  "Keep both": m(msg("Keep both")),
  "Theme file": m(msg("Theme file")),
  "Drop Liverary or VS Code .json files": m(msg("Drop Liverary or VS Code .json files")),
  "Most downloaded": m(msg("Most downloaded")),
  "Best rated": m(msg("Best rated")),
  Newest: m(msg("Newest")),
  "Most relevant": m(msg("Most relevant")),
  "Search community themes": m(msg("Search community themes")),
  "Find open-source themes from Open VSX.": m(msg("Find open-source themes from Open VSX.")),
  "Search Open VSX themes": m(msg("Search Open VSX themes")),
  "Search themes...": m(msg("Search themes...")),
  Popular: m(msg("Popular")),
  Sort: m(msg("Sort")),
  "Sort themes": m(msg("Sort themes")),
  "Searching themes...": m(msg("Searching themes...")),
  "No supported open-source themes found": m(msg("No supported open-source themes found")),
  downloads: m(msg("Download")),
  "A community color theme for your editor.": m(msg("A community color theme for your editor.")),
  "This replaces its installed variants, including any local edits. Variants no longer in the extension will be removed.":
    m(
      msg(
        "This replaces its installed variants, including any local edits. Variants no longer in the extension will be removed.",
      ),
    ),
  "Update theme": m(msg("Update theme")),
  "Choose what the thread details card shows. You can also right-click the card.": m(
    msg("Choose what the thread details card shows. You can also right-click the card."),
  ),
  "thread details": m(msg("thread details")),
  "Appended to the prompt for new and regenerated thread titles.": m(
    msg("Appended to the prompt for new and regenerated thread titles."),
  ),
  "thread title instructions": m(msg("thread title instructions")),
  "Keep titles to a few words. Lead with the main subject.": m(
    msg("Keep titles to a few words. Lead with the main subject."),
  ),
  "Read your existing Cursor CLI login from macOS Keychain to show account history and monthly limits. macOS may ask you to allow access.":
    m(
      msg(
        "Read your existing Cursor CLI login from macOS Keychain to show account history and monthly limits. macOS may ask you to allow access.",
      ),
    ),
  "No hubs configured.": m(msg("No hubs configured.")),
  "CLI Proxy": m(msg("CLI Proxy")),
  "The hub's management key is deleted from this server. Its accounts leave the Limits view; the hub itself is untouched. Add it again with the URL and key to bring them back.":
    m(
      msg(
        "The hub's management key is deleted from this server. Its accounts leave the Limits view; the hub itself is untouched. Add it again with the URL and key to bring them back.",
      ),
    ),
  "Remove hub": m(msg("Remove hub")),
  "Failed to save project actions": m(msg("Failed to save project actions")),
  "Actions not saved": m(msg("Actions not saved")),
  "This connection cannot change environment settings.": m(
    msg("This connection cannot change environment settings."),
  ),
  "Setting not saved": m(msg("Setting not saved")),
  "This connection lacks permission to change these settings.": m(
    msg("This connection lacks permission to change these settings."),
  ),
  "Setting saved on some environments": m(msg("Setting saved on some environments")),
  "Change snapshot shortcut": m(msg("Change snapshot shortcut")),
  "Press shortcut…": m(msg("Press shortcut…")),
  "Choose shortcut": m(msg("Choose shortcut")),
  "Connect an environment to set up its providers.": m(
    msg("Connect an environment to set up its providers."),
  ),
  "Restore device defaults": m(msg("Restore device defaults")),
  Reconnect: m(msg("Reconnect")),
  "Folder where new worktrees are created, on any drive, such as D:\\worktrees or ~/worktrees. Existing worktrees stay where they are. Leave empty to use the Liverary home folder.":
    m(
      msg(
        "Folder where new worktrees are created, on any drive, such as D:\\worktrees or ~/worktrees. Existing worktrees stay where they are. Leave empty to use the Liverary home folder.",
      ),
    ),
  days: m(msg("Days")),
  "Any local files": m(msg("Any local files")),
  "Uncommitted changes": m(msg("Uncommitted changes")),
  "Edited tracked files": m(msg("Edited tracked files")),
  "Rotated logs": m(msg("Rotated logs")),
  "Browser artifacts": m(msg("Browser artifacts")),
  Machine: m(msg("Machine")),
  Folder: m(msg("Folder")),
  Thread: m(msg("Thread")),
  "Could not load the last run.": m(msg("Could not load the last run.")),
  "Loading last run…": m(msg("Loading last run…")),
  "Cleanup hasn't run yet.": m(msg("Cleanup hasn't run yet.")),
  Cleanup: m(msg("Cleanup")),
  "Turn on a cleanup rule to use this.": m(msg("Turn on a cleanup rule to use this.")),
  "Deleting…": m(msg("Deleting…")),
  "Last run": m(msg("Last run")),
  "Update the selected environments to use storage cleanup, or choose a machine that supports it.":
    m(
      msg(
        "Update the selected environments to use storage cleanup, or choose a machine that supports it.",
      ),
    ),
  "Mixed across selected machines": m(msg("Mixed across selected machines")),
  "Update the selected machines to configure project worktree cleanup.": m(
    msg("Update the selected machines to configure project worktree cleanup."),
  ),
  "Keep this project's worktrees until you delete them manually.": m(
    msg("Keep this project's worktrees until you delete them manually."),
  ),
  "Use these rules for this project.": m(msg("Use these rules for this project.")),
  "Use each machine's worktree cleanup settings.": m(
    msg("Use each machine's worktree cleanup settings."),
  ),
  "Delete worktrees with deleted threads": m(msg("Delete worktrees with deleted threads")),
  "Remove unused worktrees when active or archived threads are deleted. Worktrees with local changes are kept.":
    m(
      msg(
        "Remove unused worktrees when active or archived threads are deleted. Worktrees with local changes are kept.",
      ),
    ),
  "Delete merged worktrees": m(msg("Delete merged worktrees")),
  "Remove worktrees whose pull request is merged and whose commits are included in the default branch.":
    m(
      msg(
        "Remove worktrees whose pull request is merged and whose commits are included in the default branch.",
      ),
    ),
  "Delete inactive worktrees": m(msg("Delete inactive worktrees")),
  "Remove worktrees after their threads have been inactive for this many days. Branches and thread history are kept.":
    m(
      msg(
        "Remove worktrees after their threads have been inactive for this many days. Branches and thread history are kept.",
      ),
    ),
  "Offline machines will not get this setting": m(
    msg("Offline machines will not get this setting"),
  ),
  "Remove worktrees this many days after their thread settles. Set 0 days to remove them at the next cleanup. Branches and thread history are kept.":
    m(
      msg(
        "Remove worktrees this many days after their thread settles. Set 0 days to remove them at the next cleanup. Branches and thread history are kept.",
      ),
    ),
  "Delete unchanged worktrees": m(msg("Delete unchanged worktrees")),
  "Remove worktrees with no commits beyond the default branch.": m(
    msg("Remove worktrees with no commits beyond the default branch."),
  ),
  "Includes ignored files, except node_modules.": m(
    msg("Includes ignored files, except node_modules."),
  ),
  "Deletes untracked and ignored files, including .env.": m(
    msg("Deletes untracked and ignored files, including .env."),
  ),
  "Keeps edits and untracked files. Deletes ignored files, including .env.": m(
    msg("Keeps edits and untracked files. Deletes ignored files, including .env."),
  ),
  "Delete saved browser captures after this many days. Older capture links will no longer open.": m(
    msg(
      "Delete saved browser captures after this many days. Older capture links will no longer open.",
    ),
  ),
  "Delete inactive rotated log files after this many days. Current logs are kept.": m(
    msg("Delete inactive rotated log files after this many days. Current logs are kept."),
  ),
  "Applying settings for": m(msg("Applying settings for")),
  "Environment scope": m(msg("Environment scope")),
  "Project scope": m(msg("Project scope")),
  Offline: m(msg("Offline")),
  "No matches found.": m(msg("No matches found.")),
  "Unavailable environment": m(msg("Unavailable environment")),
  "No environments": m(msg("No environments")),
  "All environments": m(msg("All environments")),
  "Search environments": m(msg("Search environments")),
  "Unavailable project": m(msg("Unavailable project")),
  "All projects": m(msg("All projects")),
  "Search projects": m(msg("Search projects")),
  Archived: m(msg("Archived")),
  "Open all environments": m(msg("Open all environments")),
  Creation: m(msg("Creation")),
  Branches: m(msg("Branches")),
  "Uses the latest commit of the base branch’s tracked remote branch, even if its name differs. Otherwise uses the same-named branch on origin. Uses your local branch if that remote branch is missing.":
    m(
      msg(
        "Uses the latest commit of the base branch’s tracked remote branch, even if its name differs. Otherwise uses the same-named branch on origin. Uses your local branch if that remote branch is missing.",
        { $context: "settingsCopy.ts" },
      ),
    ),
  "Start new worktrees from remote by default": m(
    msg("Start new worktrees from remote by default"),
  ),
  "Static prefix": m(msg("Static prefix")),
  "Semantic prefix": m(msg("Semantic prefix")),
  "Choose how new worktree branches are named from your first message.": m(
    msg("Choose how new worktree branches are named from your first message."),
  ),
  "The model chooses a prefix that describes the work, such as feat/add-search, fix/login-timeout, or refactor/auth.":
    m(
      msg(
        "The model chooses a prefix that describes the work, such as feat/add-search, fix/login-timeout, or refactor/auth.",
      ),
    ),
  "Branch prefix": m(msg("Branch prefix")),
  "No prefix": m(msg("No prefix")),
  "Branch naming instructions": m(msg("Branch naming instructions")),
  "Appended to the naming prompt. The model returns the complete branch name; no prefix or suffix is added.":
    m(
      msg(
        "Appended to the naming prompt. The model returns the complete branch name; no prefix or suffix is added.",
      ),
    ),
  "Mixed. Enter instructions to apply to all selected targets.": m(
    msg("Mixed. Enter instructions to apply to all selected targets."),
  ),
  "Use julius/ followed by the issue ID and a short description.": m(
    msg("Use julius/ followed by the issue ID and a short description."),
  ),
  Recursive: m(msg("Recursive", { $context: "settingsCopy.ts" })),
  "Top level only": m(msg("Top level only")),
  Skip: m(msg("Skip")),
  "Automatic worktree cleanup": m(msg("Automatic worktree cleanup")),
  "Delete settled worktrees": m(msg("Delete settled worktrees")),
  "Delete old browser artifacts": m(msg("Delete old browser artifacts")),
  "Delete old rotated logs": m(msg("Delete old rotated logs")),
  "Custom search URL": m(msg("Custom search URL")),
  "Native sessions": m(msg("Native sessions")),
  "Early Access": m(msg("Early Access")),
  "Kiro API key": m(msg("Kiro API key")),
  "Cursor API key": m(msg("Cursor API key")),
  "Paste API key": m(msg("Paste API key")),
  "Optional. Signs in without `kiro-cli login` (Kiro Pro and above).": m(
    msg("Optional. Signs in without `kiro-cli login` (Kiro Pro and above)."),
  ),
  "Optional. Overrides browser sign-in for this provider.": m(
    msg("Optional. Overrides browser sign-in for this provider."),
  ),
  "Access token": m(msg("Access token")),
  "Atlassian account email": m(msg("Atlassian account email")),
  "With an API token instead of an access token.": m(
    msg("With an API token instead of an access token."),
  ),
  "API token": m(msg("API token")),
  "Scoped to one repository, project, or workspace. Create it in that item's Bitbucket settings.":
    m(
      msg(
        "Scoped to one repository, project, or workspace. Create it in that item's Bitbucket settings.",
      ),
    ),
  "Reaches every repository your Atlassian account can. Give it read and write access to repositories and pull requests, plus read:user:bitbucket and read:workspace:bitbucket.":
    m(
      msg(
        "Reaches every repository your Atlassian account can. Give it read and write access to repositories and pull requests, plus read:user:bitbucket and read:workspace:bitbucket.",
      ),
    ),
  Token: m(msg("Token")),
  "A git.cafe token, used before CAFE_TOKEN and the cafe login, so GitCafe works without the CLI signed in.":
    m(
      msg(
        "A git.cafe token, used before CAFE_TOKEN and the cafe login, so GitCafe works without the CLI signed in.",
      ),
    ),
  "API key": m(msg("API key")),
  Optional: m(msg("Optional")),
  "When you return": m(msg("When you return")),
  "Before the cache expires (beta)": m(msg("Before the cache expires (beta)")),
  "Path to the Kiro CLI binary.": m(msg("Path to the Kiro CLI binary.")),
  "Claude Desktop is preferred by default. Select an installed CLI or enter its full path.": m(
    msg("Claude Desktop is preferred by default. Select an installed CLI or enter its full path."),
  ),
  "CLAUDE_CONFIG_DIR path": m(msg("CLAUDE_CONFIG_DIR path")),
  "The default account uses the Claude Code config directory. New additional accounts get a folder in Liverary's server data directory.":
    m(
      msg(
        "The default account uses the Claude Code config directory. New additional accounts get a folder in Liverary's server data directory.",
      ),
    ),
  "e.g. --chrome": m(msg("e.g. --chrome")),
  "Auto-compact after": m(msg("Auto-compact after")),
  "Compact after 100,000 to 1,000,000 tokens. Leave empty to use Claude's default.": m(
    msg("Compact after 100,000 to 1,000,000 tokens. Leave empty to use Claude's default."),
  ),
  "e.g. 300000": m(msg("e.g. 300000")),
  "When to compact an idle thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Overrides the default in Providers > Advanced.":
    m(
      msg(
        "When to compact an idle thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Overrides the default in Providers > Advanced.",
      ),
    ),
  "Use default": m(msg("Use default")),
  "Google account": m(msg("Google account")),
  "Gemini API key": m(msg("Gemini API key")),
  "Google accounts use your subscription; API keys and Agent Platform bill usage.": m(
    msg("Google accounts use your subscription; API keys and Agent Platform bill usage."),
  ),
  "Gemini or Vertex AI express key. Stored separately on the host.": m(
    msg("Gemini or Vertex AI express key. Stored separately on the host."),
  ),
  "GCP project": m(msg("GCP project")),
  "Required for Gemini Enterprise. Agent Platform uses it when no API key is set.": m(
    msg("Required for Gemini Enterprise. Agent Platform uses it when no API key is set."),
  ),
  "GCP location": m(msg("GCP location")),
  "Region for Gemini Enterprise or Agent Platform.": m(
    msg("Region for Gemini Enterprise or Agent Platform."),
  ),
  "Custom ACP executable. Leave empty to select automatically.": m(
    msg("Custom ACP executable. Leave empty to select automatically."),
  ),
  "Path to the Pi coding agent binary.": m(msg("Path to the Pi coding agent binary.")),
  "Run `pi` in a terminal and use /login, or configure an API key in ~/.pi/agent.": m(
    msg("Run `pi` in a terminal and use /login, or configure an API key in ~/.pi/agent."),
  ),
  "Set PI_CODING_AGENT_DIR to the value for this instance, then run `pi` and use /login or configure an API key there.":
    m(
      msg(
        "Set PI_CODING_AGENT_DIR to the value for this instance, then run `pi` and use /login or configure an API key there.",
      ),
    ),
  "Grok CLI is not logged in. Set GROK_HOME to the value for this instance, then run `grok login`.":
    m(
      msg(
        "Grok CLI is not logged in. Set GROK_HOME to the value for this instance, then run `grok login`.",
      ),
    ),
  "Grok CLI is installed but not logged in. Run `grok login`.": m(
    msg("Grok CLI is installed but not logged in. Run `grok login`."),
  ),
  "Additional CLI arguments passed to pi --mode rpc on session start.": m(
    msg("Additional CLI arguments passed to pi --mode rpc on session start."),
  ),
  "Path to the fx binary.": m(msg("Path to the fx binary.")),
  "Run `fx login` in a terminal using this instance's FX_HOME if set.": m(
    msg("Run `fx login` in a terminal using this instance's FX_HOME if set."),
  ),
  "Path to the Muse Code binary on this environment. Sign in with muse login on that host.": m(
    msg("Path to the Muse Code binary on this environment. Sign in with muse login on that host."),
  ),
  "Path to the Grok CLI binary.": m(msg("Path to the Grok CLI binary.")),
  "ACP source": m(msg("ACP source")),
  "Local command": m(msg("Local command")),
  "Registry agent ID": m(msg("Registry agent ID")),
  "Agent identifier from the official ACP Registry, for example 'devin'.": m(
    msg("Agent identifier from the official ACP Registry, for example 'devin'."),
  ),
  "Executable override": m(msg("Executable override")),
  "Executable on this environment. For registry agents, this overrides the distribution executable while keeping its arguments and environment.":
    m(
      msg(
        "Executable on this environment. For registry agents, this overrides the distribution executable while keeping its arguments and environment.",
      ),
    ),
  "Registry default": m(msg("Registry default")),
  "Authentication method": m(msg("Authentication method")),
  "Optional ACP authentication method ID. By default, the first agent-managed method is selected.":
    m(
      msg(
        "Optional ACP authentication method ID. By default, the first agent-managed method is selected.",
      ),
    ),
  "Path to the OpenCode binary.": m(msg("Path to the OpenCode binary.")),
  "Server URL": m(msg("Server URL")),
  "Leave blank to let Liverary spawn the server when needed.": m(
    msg("Leave blank to let Liverary spawn the server when needed."),
  ),
  "Server password": m(msg("Server password")),
  "Stored separately on the host.": m(msg("Stored separately on the host.")),
  "For example, liverary or liverary/ produces liverary/add-search. Leave empty for no prefix.": m(
    msg(
      "For example, liverary or liverary/ produces liverary/add-search. Leave empty for no prefix.",
    ),
  ),
  Executable: m(msg("Executable")),
  "Codex Desktop is preferred by default. Select an installed CLI or enter its full path.": m(
    msg("Codex Desktop is preferred by default. Select an installed CLI or enter its full path."),
  ),
  "Standalone CLI": m(msg("Standalone CLI")),
  "Desktop app (automatic)": m(msg("Desktop app (automatic)")),
  "Automatic selection": m(msg("Automatic selection")),
  "Terminal search path (PATH)": m(msg("Terminal search path (PATH)")),
  "Show install command": m(msg("Show install command")),
  "Run this command in the environment's terminal. Enter the installed CLI's full path or restart Liverary in that environment to select it from the list.":
    m(
      msg(
        "Run this command in the environment's terminal. Enter the installed CLI's full path or restart Liverary in that environment to select it from the list.",
      ),
    ),
  "The default account uses the Codex CLI home. New additional accounts get a folder in Liverary's server data directory.":
    m(
      msg(
        "The default account uses the Codex CLI home. New additional accounts get a folder in Liverary's server data directory.",
      ),
    ),
  "Account-specific Codex home. Keeps auth.json separate while sharing state from CODEX_HOME.": m(
    msg(
      "Account-specific Codex home. Keeps auth.json separate while sharing state from CODEX_HOME.",
    ),
  ),
  "Launch arguments": m(msg("Launch arguments")),
  "Additional CLI arguments passed to codex app-server on session start.": m(
    msg("Additional CLI arguments passed to codex app-server on session start."),
  ),
  "Additional CLI arguments passed on session start.": m(
    msg("Additional CLI arguments passed on session start."),
  ),
  "MCP URL copied": m(msg("MCP URL copied")),
  "Could not copy MCP URL": m(msg("Could not copy MCP URL")),
  "Management key": m(msg("Management key")),
  "Create link": m(msg("Create link")),
  "An error occurred.": m(msg("An error occurred.")),
  "Model for source control text and branch or bookmark names. When disabled, use the text generation model configured for this environment.":
    m(
      msg(
        "Model for source control text and branch or bookmark names. When disabled, use the text generation model configured for this environment.",
      ),
    ),
  "Add a Guide tab to pull requests. An agent explains the changes and points out decisions that need review.":
    m(
      msg(
        "Add a Guide tab to pull requests. An agent explains the changes and points out decisions that need review.",
      ),
    ),
  "Signed in, but the token saved below is used while it can be read.": m(
    msg("Signed in, but the token saved below is used while it can be read."),
  ),
  "That time does not exist in your time zone.": m(
    msg("That time does not exist in your time zone."),
  ),
  "Pick a date and time.": m(msg("Pick a date and time.")),
  "Pick a time.": m(msg("Pick a time.")),
  "Invalid run time": m(msg("Invalid run time")),
  "Run on": m(msg("Run on", { $context: "settingsCopy.ts" })),
  "Coalescing runs the latest payload once when the window from the first delivery closes. Empty keys run normally.":
    m(
      msg(
        "Coalescing runs the latest payload once when the window from the first delivery closes. Empty keys run normally.",
      ),
    ),
  "Requests with the same key run only once within 7 days.": m(
    msg("Requests with the same key run only once within 7 days."),
  ),
  "Duplicate request key": m(msg("Duplicate request key")),
  "On webhook": m(msg("On webhook")),
  Once: m(msg("Once")),
  "Run a prompt automatically on an interval, at a fixed time, once at a set date, or when a webhook arrives.":
    m(
      msg(
        "Run a prompt automatically on an interval, at a fixed time, once at a set date, or when a webhook arrives.",
      ),
    ),
  "This environment runs an older T3 Code. Update it to schedule a one-time task, or pick another schedule.":
    m(
      msg(
        "This environment runs an older T3 Code. Update it to schedule a one-time task, or pick another schedule.",
      ),
    ),
  "Once is not available here": m(msg("Once is not available here")),
  "This task was deleted or belongs to a different project. Check your project filter.": m(
    msg("This task was deleted or belongs to a different project. Check your project filter."),
  ),
  "Expo access token": m(msg("Expo access token")),
  "Give the host a label and limits within the ranges shown.": m(
    msg("Give the host a label and limits within the ranges shown."),
  ),
  "Idle minutes must be smaller than session minutes.": m(
    msg("Idle minutes must be smaller than session minutes."),
  ),
  "Enter a valid secret reference.": m(msg("Enter a valid secret reference.")),
  "idle host power interval": m(msg("idle host power interval")),
  "active host power interval": m(msg("active host power interval")),
  "provider health interval": m(msg("provider health interval")),
  "Grouping rule decides how each checkout joins project groups in the sidebar. Changing it can move a checkout to a different project.":
    m(
      msg(
        "Grouping rule decides how each checkout joins project groups in the sidebar. Changing it can move a checkout to a different project.",
      ),
    ),
  "Use global default": m(msg("Use global default")),
  "Could not save grouping rule": m(msg("Could not save grouping rule")),
  "Get help": m(msg("Get help", { $context: "settingsCopy.ts" })),
  Organization: m(msg("Organization")),
  "Snooze threads until their usage limits reset. Enable auto-resume to continue the agent after the reset.":
    m(
      msg(
        "Snooze threads until their usage limits reset. Enable auto-resume to continue the agent after the reset.",
      ),
    ),
  "Automatically resume threads when their usage limits reset. You can cancel auto-resume in each thread.":
    m(
      msg(
        "Automatically resume threads when their usage limits reset. You can cancel auto-resume in each thread.",
      ),
    ),
  "Open pull requests and changes panels proactively": m(
    msg("Open pull requests and changes panels proactively"),
  ),
  " Enter a new value to rename a saved one or make it plain text.": m(
    msg(" Enter a new value to rename a saved one or make it plain text."),
  ),
  "Checking credentials and loading models…": m(msg("Checking credentials and loading models…")),
  "Connecting…": m(msg("Connecting…")),
  "Automatic (mixed)": m(msg("Automatic (mixed)")),
  "Only built-in themes show artwork.": m(msg("Only built-in themes show artwork.")),
  "Only built-in themes show artwork, so this theme shows the version pill.": m(
    msg("Only built-in themes show artwork, so this theme shows the version pill."),
  ),
  ", which is not available in this build. Its configuration is preserved.": m(
    msg(", which is not available in this build. Its configuration is preserved."),
  ),
  "12-hour": m(msg("12-hour")),
  "24-hour": m(msg("24-hour")),
  "API keys, base URLs, and other per-instance CLI settings.": m(
    msg("API keys, base URLs, and other per-instance CLI settings."),
  ),
  About: m(msg("About")),
  "Accent color": m(msg("Accent color")),
  "Accent color hue": m(msg("Accent color hue")),
  Account: m(msg("Account")),
  Actions: m(msg("Actions")),
  Add: m(msg("Add")),
  "Add an account or configure a provider on": m(msg("Add an account or configure a provider on")),
  "Add argument": m(msg("Add argument")),
  "Add choice": m(msg("Add choice")),
  "Add color": m(msg("Add color")),
  "Add custom model": m(msg("Add custom model")),
  "Add instance": m(msg("Add instance")),
  "Add keybinding": m(msg("Add keybinding")),
  "Add project base directory": m(msg("Add project base directory")),
  "Add project starts in": m(msg("Add project starts in")),
  "Add provider": m(msg("Add provider")),
  "Add secret provider": m(msg("Add secret provider")),
  "Add theme": m(msg("Add theme")),
  "Add to favorites": m(msg("Add to favorites")),
  "Add variable": m(msg("Add variable")),
  "Adjust the contrast of colors and borders across the interface.": m(
    msg("Adjust the contrast of colors and borders across the interface."),
  ),
  Advanced: m(msg("Advanced", { $context: "settingsCopy.ts" })),
  "Agent browser access": m(msg("Agent browser access")),
  Agents: m(msg("Agents")),
  "Agents can use devices": m(msg("Agents can use devices")),
  All: m(msg("All")),
  "All selected connected environments must support restart continuation.": m(
    msg("All selected connected environments must support restart continuation."),
  ),
  "Allow notifications in your browser or system settings, then choose this option again. Sound only is still available.":
    m(
      msg(
        "Allow notifications in your browser or system settings, then choose this option again. Sound only is still available.",
      ),
    ),
  "Also include skills in the / command menu. Skills always appear when you type $.": m(
    msg("Also include skills in the / command menu. Skills always appear when you type $."),
  ),
  Always: m(msg("Always")),
  "Antigravity download": m(msg("Antigravity download")),
  "Antigravity setup": m(msg("Antigravity setup")),
  "Any new activity un-settles a thread automatically.": m(
    msg("Any new activity un-settles a thread automatically."),
  ),
  App: m(msg("App")),
  Appearance: m(msg("Appearance")),
  "Appearance mode": m(msg("Appearance mode")),
  Archive: m(msg("Archive")),
  "Archive confirmation": m(msg("Archive confirmation")),
  "Archived threads": m(msg("Archived threads")),
  Arguments: m(msg("Arguments")),
  "Artifacts and logs": m(msg("Artifacts and logs")),
  Artwork: m(msg("Artwork")),
  "Ask before deleting a thread and its chat history.": m(
    msg("Ask before deleting a thread and its chat history."),
  ),
  "Ask before unpinning a thread from the pinned section.": m(
    msg("Ask before unpinning a thread from the pinned section."),
  ),
  Authenticated: m(msg("Authenticated")),
  "Authenticated as": m(msg("Authenticated as")),
  "Authentication request expired": m(msg("Authentication request expired")),
  "Auto-settle": m(msg("Auto-settle")),
  "Auto-settle inactive threads": m(msg("Auto-settle inactive threads")),
  "Auto-settle merged threads": m(msg("Auto-settle merged threads")),
  "Auto-show floating preview": m(msg("Auto-show floating preview")),
  Automatic: m(msg("Automatic")),
  "Automatic installation unavailable. Set a binary path or use another environment.": m(
    msg("Automatic installation unavailable. Set a binary path or use another environment."),
  ),
  "Automatic updates are not available in this build.": m(
    msg("Automatic updates are not available in this build."),
  ),
  "Automatically pull": m(msg("Automatically pull")),
  "Automatically resume interrupted threads after an update, crash, or machine restart on the selected environments.":
    m(
      msg(
        "Automatically resume interrupted threads after an update, crash, or machine restart on the selected environments.",
      ),
    ),
  Available: m(msg("Available")),
  Back: m(msg("Back")),
  "Background activity": m(msg("Background activity")),
  "Background policy details": m(msg("Background policy details")),
  Balanced: m(msg("Balanced")),
  Bars: m(msg("Bars")),
  "Battery saver": m(msg("Battery saver")),
  "Binary path": m(msg("Binary path")),
  "Blue & orange": m(msg("Blue & orange")),
  "Boring sidebar (group by project)": m(msg("Boring sidebar (group by project)")),
  Browser: m(msg("Browser")),
  "Browser profiles": m(msg("Browser profiles")),
  "Browser recording frame rate": m(msg("Browser recording frame rate")),
  "Built-in default": m(msg("Built-in default")),
  "CLI not detected on PATH.": m(msg("CLI not detected on PATH.")),
  "CODEX_HOME path": m(msg("CODEX_HOME path")),
  Cancel: m(msg("Cancel")),
  "Cancel installation": m(msg("Cancel installation")),
  "Cancel new keybinding": m(msg("Cancel new keybinding")),
  "Cancel sign-in": m(msg("Cancel sign-in")),
  "Cancelling installation": m(msg("Cancelling installation")),
  "Capture animations": m(msg("Capture animations")),
  "Capture flash": m(msg("Capture flash")),
  "Capture shortcut": m(msg("Capture shortcut")),
  "Capture sound": m(msg("Capture sound")),
  "Change accent color": m(msg("Change accent color")),
  "Change account": m(msg("Change account")),
  Chat: m(msg("Chat")),
  "Chat width": m(msg("Chat width")),
  "Check installed provider CLIs for newer available versions and fetch model catalog updates. When off, new models may not appear.":
    m(
      msg(
        "Check installed provider CLIs for newer available versions and fetch model catalog updates. When off, new models may not appear.",
      ),
    ),
  "Check provider versions": m(msg("Check provider versions")),
  Checked: m(msg("Checked")),
  "Checked unavailable": m(msg("Checked unavailable")),
  "Checking provider status": m(msg("Checking provider status")),
  "Checking the Antigravity runtime.": m(msg("Checking the Antigravity runtime.")),
  "Checking the downloaded runtime.": m(msg("Checking the downloaded runtime.")),
  "Checking what this session is allowed to change.": m(
    msg("Checking what this session is allowed to change."),
  ),
  "Checking your account…": m(msg("Checking your account…")),
  "Checking...": m(msg("Checking...")),
  "Checking…": m(msg("Checking…")),
  "Choice label": m(msg("Choice label")),
  "Choice value": m(msg("Choice value")),
  Choices: m(msg("Choices")),
  "Choose colors for additions and deletions, including change counts.": m(
    msg("Choose colors for additions and deletions, including change counts."),
  ),
  "Choose how development environments are identified.": m(
    msg("Choose how development environments are identified."),
  ),
  "Choose when Enter sends a prompt or inserts a new line": m(
    msg("Choose when Enter sends a prompt or inserts a new line"),
  ),
  "Clear color": m(msg("Clear color")),
  "Clear settings search": m(msg("Clear settings search")),
  "Click to hide email": m(msg("Click to hide email")),
  "Click to reveal email": m(msg("Click to reveal email")),
  Code: m(msg("Code")),
  "Code and terminal need a fixed-width font, so the current font was kept.": m(
    msg("Code and terminal need a fixed-width font, so the current font was kept."),
  ),
  "Code blocks, diffs, and file previews.": m(msg("Code blocks, diffs, and file previews.")),
  "Code blocks, diffs, file previews, and the terminal.": m(
    msg("Code blocks, diffs, file previews, and the terminal."),
  ),
  "Code font": m(msg("Code font")),
  "Code font size": m(msg("Code font size")),
  Collapsed: m(msg("Collapsed")),
  "Color scheme": m(msg("Color scheme")),
  "Colors & themes": m(msg("Colors & themes")),
  "Combine matching repositories across environments.": m(
    msg("Combine matching repositories across environments."),
  ),
  Comfortable: m(msg("Comfortable")),
  "Comfortable (default)": m(msg("Comfortable (default)")),
  Command: m(msg("Command")),
  "Compact idle threads": m(msg("Compact idle threads")),
  "Complete sign-in in the terminal below.": m(msg("Complete sign-in in the terminal below.")),
  Composer: m(msg("Composer")),
  "Composer context": m(msg("Composer context")),
  Condition: m(msg("Condition")),
  "Configure manually": m(msg("Configure manually")),
  "Confirm thread archiving": m(msg("Confirm thread archiving")),
  "Confirm thread deletion": m(msg("Confirm thread deletion")),
  "Confirm thread unpinning": m(msg("Confirm thread unpinning")),
  Confirmations: m(msg("Confirmations")),
  Connect: m(msg("Connect")),
  "Connect an environment to change keybindings.": m(
    msg("Connect an environment to change keybindings."),
  ),
  "Connect an environment to choose its text generation model.": m(
    msg("Connect an environment to choose its text generation model."),
  ),
  "Connect an execution environment before configuring providers.": m(
    msg("Connect an execution environment before configuring providers."),
  ),
  Connections: m(msg("Connections")),
  "Context window indicator": m(msg("Context window indicator")),
  "Context window indicator (legacy)": m(msg("Context window indicator (legacy)")),
  Continue: m(msg("Continue")),
  "Continue authentication": m(msg("Continue authentication")),
  "Continue threads after restarts": m(msg("Continue threads after restarts")),
  "Continue to sign-in": m(msg("Continue to sign-in")),
  Contrast: m(msg("Contrast")),
  "Conventional Commits": "Conventional Commits",
  "Copy command": m(msg("Copy command", { $context: "settingsCopy.ts" })),
  "Copy from…": m(msg("Copy from…")),
  "Copy options from a built-in model": m(msg("Copy options from a built-in model")),
  "Copy sign-in link": m(msg("Copy sign-in link")),
  "Copy update command": m(msg("Copy update command")),
  "Copy version": m(msg("Copy version")),
  "Could not add provider instance": m(msg("Could not add provider instance")),
  "Could not check for updates": m(msg("Could not check for updates")),
  "Could not confirm update": m(msg("Could not confirm update")),
  "Could not connect to this device": m(msg("Could not connect to this device")),
  "Could not continue authentication": m(msg("Could not continue authentication")),
  "Could not copy the sign-in link.": m(msg("Could not copy the sign-in link.")),
  "Could not copy version": m(msg("Could not copy version")),
  "Could not delete provider instance": m(msg("Could not delete provider instance")),
  "Could not finish sign-in on this computer. Try again or paste the redirect URL below.": m(
    msg("Could not finish sign-in on this computer. Try again or paste the redirect URL below."),
  ),
  "Could not open the sign-in page. Copy the link and open it in your browser.": m(
    msg("Could not open the sign-in page. Copy the link and open it in your browser."),
  ),
  "Could not read setup status. Reconnect and try again.": m(
    msg("Could not read setup status. Reconnect and try again."),
  ),
  "Could not reset provider instance": m(msg("Could not reset provider instance")),
  "Could not send input to the provider sign-in terminal.": m(
    msg("Could not send input to the provider sign-in terminal."),
  ),
  "Could not update provider instance": m(msg("Could not update provider instance")),
  "Couldn't change this setting.": m(msg("Couldn't change this setting.")),
  "Couldn’t remove theme": m(msg("Couldn’t remove theme")),
  "Couldn’t restore theme settings": m(msg("Couldn’t restore theme settings")),
  "Couldn’t save theme selection": m(msg("Couldn’t save theme selection")),
  "Create theme": m(msg("Create theme")),
  "Created at": m(msg("Created at")),
  "Cursor account": m(msg("Cursor account")),
  Custom: m(msg("Custom")),
  "Custom hex accent color": m(msg("Custom hex accent color")),
  "Custom instructions": m(msg("Custom instructions")),
  "Custom models are always shown in the picker": m(
    msg("Custom models are always shown in the picker"),
  ),
  "Custom option": m(msg("Custom option")),
  "Custom…": m(msg("Custom…")),
  Dark: m(msg("Dark", { $context: "settingsCopy.ts" })),
  "Days of inactivity before auto-settle": m(msg("Days of inactivity before auto-settle")),
  Default: m(msg("Default")),
  "Default automatic pull": m(msg("Default automatic pull")),
  "Default browser appearance": m(msg("Default browser appearance")),
  "Default browser profile": m(msg("Default browser profile")),
  "Default browser viewport": m(msg("Default browser viewport")),
  "Default browser zoom": m(msg("Default browser zoom")),
  "Default choice": m(msg("Default choice")),
  "Default diff file state": m(msg("Default diff file state")),
  "Default merge method": m(msg("Default merge method")),
  "Default model": m(msg("Default model")),
  "Default model for new threads, selected automatically. Projects can override it.": m(
    msg("Default model for new threads, selected automatically. Projects can override it."),
  ),
  "Default model for new threads. Projects can override it.": m(
    msg("Default model for new threads. Projects can override it."),
  ),
  "Default model not saved": m(msg("Default model not saved")),
  "Default permissions": m(msg("Default permissions")),
  "Default permissions for new threads. Projects can override them.": m(
    msg("Default permissions for new threads. Projects can override them."),
  ),
  "Default pull request merge method": m(msg("Default pull request merge method")),
  "Default workspace": m(msg("Default workspace")),
  "Delete confirmation": m(msg("Delete confirmation")),
  "Delete now": m(msg("Delete now")),
  "Dev artwork": m(msg("Dev artwork")),
  Device: m(msg("Device")),
  "Device sources": m(msg("Device sources")),
  "Device that runs this provider.": m(msg("Device that runs this provider.")),
  "Device unavailable": m(msg("Device unavailable")),
  Devices: m(msg("Devices")),
  Diagnostics: m(msg("Diagnostics")),
  "Diff colors": m(msg("Diff colors")),
  "Diff layout": m(msg("Diff layout", { $context: "settingsCopy.ts" })),
  "Diff whitespace changes": m(msg("Diff whitespace changes")),
  Diffs: m(msg("Diffs")),
  "Diffs & pull requests": m(msg("Diffs & pull requests")),
  Direct: m(msg("Direct", { $context: "settingsCopy.ts" })),
  "Disable all": m(msg("Disable all")),
  Disabled: m(msg("Disabled", { $context: "settingsCopy.ts" })),
  "Discovering sign-in methods…": m(msg("Discovering sign-in methods…")),
  Display: m(msg("Display")),
  "Display name": m(msg("Display name")),
  Docs: m(msg("Docs")),
  Done: m(msg("Done")),
  "Double press": m(msg("Double press")),
  Download: m(msg("Download")),
  "Download failed.": m(msg("Download failed.")),
  "Downloading…": m(msg("Downloading…")),
  Driver: m(msg("Driver")),
  "Duplicate theme": m(msg("Duplicate theme")),
  "Each paragraph or code block appears as soon as it is complete.": m(
    msg("Each paragraph or code block appears as soon as it is complete."),
  ),
  "Edit name and options": m(msg("Edit name and options")),
  "Edit theme": m(msg("Edit theme")),
  "Effort display": m(msg("Effort display")),
  Empty: m(msg("Empty")),
  "Enable Antigravity": m(msg("Enable Antigravity")),
  "Enable all": m(msg("Enable all")),
  "Enter a model slug.": m(msg("Enter a model slug.")),
  "Enter an official registry ID and any local executable or auth override.": m(
    msg("Enter an official registry ID and any local executable or auth override."),
  ),
  "Enter code": m(msg("Enter code")),
  "Enter manually": m(msg("Enter manually")),
  "Enter your credentials below.": m(msg("Enter your credentials below.")),
  Environment: m(msg("Environment")),
  "Environment icon": m(msg("Environment icon")),
  "Environment identification": m(msg("Environment identification")),
  "Environment-wide setting. Select an environment to change it.": m(
    msg("Environment-wide setting. Select an environment to change it."),
  ),
  Environments: m(msg("Environments")),
  "Everything outside code blocks and the terminal.": m(
    msg("Everything outside code blocks and the terminal."),
  ),
  "Executable is required.": m(msg("Executable is required.")),
  "Executable name or path on this environment.": m(
    msg("Executable name or path on this environment."),
  ),
  Expanded: m(msg("Expanded", { $context: "settingsCopy.ts" })),
  "Export theme file": m(msg("Export theme file")),
  "Extracting Antigravity.": m(msg("Extracting Antigravity.")),
  "Failed to refresh providers": m(msg("Failed to refresh providers")),
  "Fallback model": m(msg("Fallback model")),
  "Fallback model not saved": m(msg("Fallback model not saved")),
  "Fast mode": m(msg("Fast mode")),
  "Filter models": m(msg("Filter models")),
  "Finish signing in in your browser.": m(msg("Finish signing in in your browser.")),
  "Fix the expression above to continue editing visually.": m(
    msg("Fix the expression above to continue editing visually."),
  ),
  "Fold working and monitoring threads into a Working section. They return to the top of the inbox when they need you. The boring sidebar in Labs has no Working section.":
    m(
      msg(
        "Fold working and monitoring threads into a Working section. They return to the top of the inbox when they need you. The boring sidebar in Labs has no Working section.",
      ),
    ),
  "Follow change request templates": m(msg("Follow change request templates")),
  "Follow system": m(msg("Follow system")),
  "Follow the system appearance": m(msg("Follow the system appearance")),
  "Follow-up behavior": m(msg("Follow-up behavior")),
  "Follow-ups": m(msg("Follow-ups")),
  "Font smoothing": m(msg("Font smoothing")),
  Full: m(msg("Full")),
  General: m(msg("General")),
  "Git fetch interval": m(msg("Git fetch interval")),
  "Glass opacity": m(msg("Glass opacity")),
  Group: m(msg("Group")),
  "Guest links": m(msg("Guest links")),
  "Stop all active guest links in the selected environments.": m(
    msg("Stop all active guest links in the selected environments."),
  ),

  "Health check interval": m(msg("Health check interval")),
  "Hidden from picker": m(msg("Hidden from picker")),
  "Hide whitespace changes": m(msg("Hide whitespace changes")),
  "Hide whitespace changes by default": m(msg("Hide whitespace changes by default")),
  "Higher values make menus, dialogs, and the composer more solid.": m(
    msg("Higher values make menus, dialogs, and the composer more solid."),
  ),
  Hold: m(msg("Hold")),
  "Hold mode also quits on two quick presses.": m(
    msg("Hold mode also quits on two quick presses."),
  ),
  "How new worktrees in this project populate git submodules.": m(
    msg("How new worktrees in this project populate git submodules."),
  ),
  "How new worktrees populate git submodules. Projects and their liverary.json can override it.": m(
    msg(
      "How new worktrees populate git submodules. Projects and their liverary.json can override it.",
    ),
  ),

  "If sign-in doesn't return to T3 Code, paste the URL from the final localhost page.": m(
    msg("If sign-in doesn't return to T3 Code, paste the URL from the final localhost page."),
  ),
  "If the final localhost page does not load, paste its full URL here.": m(
    msg("If the final localhost page does not load, paste its full URL here."),
  ),
  "In-app notifications": m(msg("In-app notifications")),
  "Inactivity does not settle threads with a pull request. Merge and close still do.": m(
    msg("Inactivity does not settle threads with a pull request. Merge and close still do."),
  ),
  "Include app text": m(msg("Include app text")),
  Incompatible: m(msg("Incompatible")),
  Inherit: m(msg("Inherit")),
  "Inherited from the project's configuration file": m(
    msg("Inherited from the project's configuration file"),
  ),
  Inherits: m(msg("Inherits")),
  "Inspect processes, resource use, and logs on one environment at a time.": m(
    msg("Inspect processes, resource use, and logs on one environment at a time."),
  ),
  "Inspect processes, resource use, and logs on this environment.": m(
    msg("Inspect processes, resource use, and logs on this environment."),
  ),
  Install: m(msg("Install")),
  "Install Antigravity": m(msg("Install Antigravity")),
  "Install and manage Antigravity.": m(msg("Install and manage Antigravity.")),
  "Install failed.": m(msg("Install failed.")),
  "Install managed runtime": m(msg("Install managed runtime")),
  "Installed · Sign-in not checked": m(msg("Installed · Sign-in not checked")),
  "Instance ID": m(msg("Instance ID")),
  "Instance ID is required.": m(msg("Instance ID is required.")),
  "Instance ID must be 64 characters or fewer.": m(
    msg("Instance ID must be 64 characters or fewer."),
  ),
  "Instance ID must start with a letter and use only letters, digits, '-', or '_'.": m(
    msg("Instance ID must start with a letter and use only letters, digits, '-', or '_'."),
  ),
  "Instance label": m(msg("Instance label")),
  Interface: m(msg("Interface")),
  "Interface font": m(msg("Interface font")),
  "Interface font size": m(msg("Interface font size")),
  "It’s now active.": m(msg("It’s now active.")),
  "Keep agent credits": m(msg("Keep agent credits")),
  "Keep branch and worktree controls below the composer after a thread starts.": m(
    msg("Keep branch and worktree controls below the composer after a thread starts."),
  ),
  "Keep composer context visible in active threads": m(
    msg("Keep composer context visible in active threads"),
  ),
  "Keep threads with a PR": m(msg("Keep threads with a PR")),
  "Keep worktrees with local changes": m(msg("Keep worktrees with local changes")),
  "Keeps the default branch current when the checkout has no local changes or commits. Projects can override it.":
    m(
      msg(
        "Keeps the default branch current when the checkout has no local changes or commits. Projects can override it.",
      ),
    ),
  "Keeps this project's default branch current when the checkout has no local changes or commits.":
    m(
      msg(
        "Keeps this project's default branch current when the checkout has no local changes or commits.",
      ),
    ),
  Keybindings: m(msg("Keybindings")),
  "Known broken version": m(msg("Known broken version")),
  Label: m(msg("Label")),
  Labs: m(msg("Labs")),
  "Last selected": m(msg("Last selected")),
  "Last user message": m(msg("Last user message")),
  'Leave empty to use "~/" when the Add Project browser opens.': m(
    msg('Leave empty to use "~/" when the Add Project browser opens.'),
  ),
  Legal: m(msg("Legal")),
  "Letters, digits, '-', or '_'.": m(msg("Letters, digits, '-', or '_'.")),
  Light: m(msg("Light", { $context: "settingsCopy.ts" })),
  "Light and dark theme variants": m(msg("Light and dark theme variants")),
  "Limited permissions": m(msg("Limited permissions")),
  "Limited support": m(msg("Limited support")),
  "Linked environments": m(msg("Linked environments")),
  "Load balancing": m(msg("Load balancing")),
  "Loading devices": m(msg("Loading devices")),
  "Loading provider settings": m(msg("Loading provider settings")),
  "Loading sign-in terminal…": m(msg("Loading sign-in terminal…")),
  "Local ACP": m(msg("Local ACP")),
  "Local ACP command": m(msg("Local ACP command")),
  "Local device": m(msg("Local device")),
  "Local environment": m(msg("Local environment")),
  "Local simulators": m(msg("Local simulators")),
  Maintenance: m(msg("Maintenance")),
  "Managed binary cleanup failed.": m(msg("Managed binary cleanup failed.")),
  Manual: m(msg("Manual")),
  Mixed: m(msg("Mixed")),
  "Mixed across selected environments": m(msg("Mixed across selected environments")),
  Model: m(msg("Model")),
  "Model for new threads in this project.": m(msg("Model for new threads in this project.")),
  "Model preferences and custom models are saved on the selected environment and shared across connected devices.":
    m(
      msg(
        "Model preferences and custom models are saved on the selected environment and shared across connected devices.",
      ),
    ),
  Models: m(msg("Models")),
  "Monospace font": m(msg("Monospace font")),
  "More providers": m(msg("More providers")),
  "Move down": m(msg("Move down")),
  "Move up": m(msg("Move up")),
  "Needs attention": m(msg("Needs attention")),
  "Negate group": m(msg("Negate group")),
  "Network access": m(msg("Network access")),
  Never: m(msg("Never")),
  "New keybinding": m(msg("New keybinding")),
  "New projects": m(msg("New projects")),
  "New thread mode": m(msg("New thread mode")),
  "New threads": m(msg("New threads")),
  "New worktrees start from remote": m(msg("New worktrees start from remote")),
  Next: m(msg("Next")),
  "No connected devices": m(msg("No connected devices")),
  "No custom options. The composer uses the provider's default options.": m(
    msg("No custom options. The composer uses the provider's default options."),
  ),
  "No fonts found.": m(msg("No fonts found.")),
  "No in-app sign-in advertised. Follow the provider's docs to finish setup.": m(
    msg("No in-app sign-in advertised. Follow the provider's docs to finish setup."),
  ),
  "No keybindings match your search.": m(msg("No keybindings match your search.")),
  "No models match.": m(msg("No models match.")),
  "No models reported for this provider yet.": m(msg("No models reported for this provider yet.")),
  "No providers available": m(msg("No providers available")),
  "No providers configured.": m(msg("No providers configured.")),
  "No reasoning": m(msg("No reasoning")),
  "No settings found": m(msg("No settings found")),
  "No text generation providers available.": m(msg("No text generation providers available.")),
  None: m(msg("None")),
  Not: m(msg("Not")),
  "Not authenticated": m(msg("Not authenticated")),
  "Not found": m(msg("Not found")),
  "Not installed": m(msg("Not installed")),
  "Not installed.": m(msg("Not installed.")),
  "Not set": m(msg("Not set")),
  "Notices for dependencies, assets, and optional tools used by T3 Code.": m(
    msg("Notices for dependencies, assets, and optional tools used by T3 Code."),
  ),
  Notifications: m(msg("Notifications")),
  "Notifications are unavailable in this browser. Sound only is still available.": m(
    msg("Notifications are unavailable in this browser. Sound only is still available."),
  ),
  "Notifications need a supported browser over HTTPS, or the desktop app. Sound only is still available.":
    m(
      msg(
        "Notifications need a supported browser over HTTPS, or the desktop app. Sound only is still available.",
      ),
    ),
  Off: m(msg("Off")),
  On: m(msg("On")),
  "One literal argument per row, in launch order.": m(
    msg("One literal argument per row, in launch order."),
  ),
  "Only the box you write prompts in. Mono works well here.": m(
    msg("Only the box you write prompts in. Mono works well here."),
  ),
  "Open browser": m(msg("Open browser")),
  "Open docs": m(msg("Open docs")),
  "Open keybindings.json": m(msg("Open keybindings.json")),
  "Open linked pull requests first. Otherwise, open Changes for edits to at least 3 files or 50 lines.":
    m(
      msg(
        "Open linked pull requests first. Otherwise, open Changes for edits to at least 3 files or 50 lines.",
      ),
    ),
  "Open links in": m(msg("Open links in")),
  "Open pull requests in T3 Code": m(msg("Open pull requests in T3 Code")),
  "Open source licenses": m(msg("Open source licenses")),
  "OpenTelemetry export": m(msg("OpenTelemetry export")),
  Option: m(msg("Option")),
  "Option id": m(msg("Option id")),
  "Option label": m(msg("Option label")),
  "Option type": m(msg("Option type")),
  "Optional marker shown in the picker.": m(msg("Optional marker shown in the picker.")),
  "Options shown in the composer": m(msg("Options shown in the composer")),
  "Or choose from ACP Registry": m(msg("Or choose from ACP Registry")),
  "Order of projects in the sidebar project picker and command palette.": m(
    msg("Order of projects in the sidebar project picker and command palette."),
  ),
  "Overridden by": m(msg("Overridden by")),
  "Overridden for this project": m(msg("Overridden for this project")),
  "Overridden for this project. Show where this value comes from": m(
    msg("Overridden for this project. Show where this value comes from"),
  ),
  "Panel animation duration": m(msg("Panel animation duration")),
  "Panel animations": m(msg("Panel animations")),
  "Paste the URL from the sign-in tab": m(msg("Paste the URL from the sign-in tab")),
  Performance: m(msg("Performance")),
  Permissions: m(msg("Permissions")),
  "Permissions for new threads in this project.": m(
    msg("Permissions for new threads in this project."),
  ),
  "Plain text": m(msg("Plain text")),
  "Press shortcut": m(msg("Press shortcut")),
  "Primary device": m(msg("Primary device")),
  "Privacy policy": m(msg("Privacy policy")),
  Project: m(msg("Project")),
  "Project Grouping": m(msg("Project Grouping")),
  "Project defaults and overrides": m(msg("Project defaults and overrides")),
  "Project grouping": m(msg("Project grouping")),
  "Project order": m(msg("Project order")),
  "Project overview": m(msg("Project overview")),
  Projects: m(msg("Projects")),
  "Prompt font": m(msg("Prompt font")),
  "Prompt font size": m(msg("Prompt font size")),
  Provider: m(msg("Provider", { $context: "settingsCopy.ts" })),
  "Provider default": m(msg("Provider default")),
  "Provider deleted, but managed files remain": m(
    msg("Provider deleted, but managed files remain"),
  ),
  "Provider health check interval in seconds": m(msg("Provider health check interval in seconds")),
  "Provider instance added": m(msg("Provider instance added")),
  "Provider settings are unavailable": m(msg("Provider settings are unavailable")),
  "Provider setup failed.": m(msg("Provider setup failed.")),
  "Provider setup failed. Try again.": m(msg("Provider setup failed. Try again.")),
  "Provider setup is read-only.": m(msg("Provider setup is read-only.")),
  "Provider sign-in failed. Try again.": m(msg("Provider sign-in failed. Try again.")),
  "Provider sign-in link": m(msg("Provider sign-in link")),
  "Provider update checks": m(msg("Provider update checks")),
  Providers: m(msg("Providers", { $context: "settingsCopy.ts" })),
  "Publish agent activity": m(msg("Publish agent activity")),
  "Pull request sharing": m(msg("Pull request sharing")),
  "Pull requests": "PR",
  "Pull requests in this project start with this method.": m(
    msg("Pull requests in this project start with this method."),
  ),
  "Pull requests start with this method. Last selected reuses whatever you chose most recently on this device.":
    m(
      msg(
        "Pull requests start with this method. Last selected reuses whatever you chose most recently on this device.",
      ),
    ),
  Queue: m(msg("Queue")),
  "Quit shortcut": m(msg("Quit shortcut")),
  "Quit shortcut behavior": m(msg("Quit shortcut behavior")),
  "Reading connected execution environments.": m(msg("Reading connected execution environments.")),
  Ready: m(msg("Ready")),
  "Reconnect the selected environment to change this setting.": m(
    msg("Reconnect the selected environment to change this setting."),
  ),
  "Reconnect this device to set up its provider, or select another device.": m(
    msg("Reconnect this device to set up its provider, or select another device."),
  ),
  "Red & green (default)": m(msg("Red & green (default)")),
  "Refresh provider status": m(msg("Refresh provider status", { $context: "settingsCopy.ts" })),
  "Refresh provider status, versions, and models in the background. Set to 0 to disable.": m(
    msg("Refresh provider status, versions, and models in the background. Set to 0 to disable."),
  ),
  "Refresh the provider and start the authentication flow again.": m(
    msg("Refresh the provider and start the authentication flow again."),
  ),
  "Refreshing providers": m(msg("Refreshing providers")),
  "Reinstall Antigravity": m(msg("Reinstall Antigravity")),
  "Remote device": m(msg("Remote device")),
  Remove: m(msg("Remove")),
  "Remove agent credits when merging": m(msg("Remove agent credits when merging")),
  "Remove choice": m(msg("Remove choice")),
  "Remove custom model": m(msg("Remove custom model")),
  "Remove downloaded runtime": m(msg("Remove downloaded runtime")),
  "Remove from favorites": m(msg("Remove from favorites", { $context: "settingsCopy.ts" })),
  "Remove recognized agent credit lines from merge and squash messages on hosts that support it, keeping human co-authors. Includes auto-merge. Excludes merge queues, stack merges, and existing commits.":
    m(
      msg(
        "Remove recognized agent credit lines from merge and squash messages on hosts that support it, keeping human co-authors. Includes auto-merge. Excludes merge queues, stack merges, and existing commits.",
      ),
    ),
  "Remove theme": m(msg("Remove theme")),
  "Remove themes": m(msg("Remove themes")),
  "Removing runtime": m(msg("Removing runtime")),
  "Render math": m(msg("Render math")),
  "Repository conventions": m(msg("Repository conventions")),
  "Require a second click on the inline archive action before a thread is archived.": m(
    msg("Require a second click on the inline archive action before a thread is archived."),
  ),
  Reset: m(msg("Reset")),
  "Reset automatic pull to off": m(msg("Reset automatic pull to off")),
  "Reset to default": m(msg("Reset to default")),
  "Reset to inherited value": m(msg("Reset to inherited value")),
  "Reset to last selected": m(msg("Reset to last selected")),
  "Reset to the device setting": m(msg("Reset to the device setting")),
  "Response streaming": m(msg("Response streaming")),
  "Restart and turn off": m(msg("Restart and turn off")),
  "Restart and turn on": m(msg("Restart and turn on")),
  "Restarting…": m(msg("Restarting…")),
  "Restore default settings?": m(msg("Restore default settings?")),
  "Resume after usage limits": m(msg("Resume after usage limits")),
  "Resume usage-limit stops at the reported reset time. Each thread can cancel its scheduled continuation.":
    m(
      msg(
        "Resume usage-limit stops at the reported reset time. Each thread can cancel its scheduled continuation.",
      ),
    ),
  "Retry connection": m(msg("Retry connection")),
  "Retry installation": m(msg("Retry installation")),
  "Retry setup status": m(msg("Retry setup status")),
  "Retry sign-in": m(msg("Retry sign-in")),
  Review: m(msg("Review")),
  "Review guide instructions": m(msg("Review guide instructions")),
  "Review guide model": m(msg("Review guide model")),
  "Review guides (beta)": m(msg("Review guides (beta)")),
  "Rich text composer": m(msg("Rich text composer")),
  "Run T3 Code's CLI as `t3` from any terminal.": m(
    msg("Run T3 Code's CLI as `t3` from any terminal."),
  ),
  "Run agents on this computer. Turn off to use T3 Code only with remote environments.": m(
    msg("Run agents on this computer. Turn off to use T3 Code only with remote environments."),
  ),
  "Run it in a terminal when you are ready to update.": m(
    msg("Run it in a terminal when you are ready to update."),
  ),
  Runtime: m(msg("Runtime")),
  "Same on all machines": m(msg("Same on all machines")),
  Save: m(msg("Save")),
  Saving: m(msg("Saving")),
  "Scheduled tasks": m(msg("Scheduled tasks")),
  Search: m(msg("Search")),
  "Search engine": m(msg("Search engine")),
  "Search fonts…": m(msg("Search fonts…")),
  "Search keybindings": m(msg("Search keybindings")),
  "Search registry": m(msg("Search registry")),
  "Search settings": m(msg("Search settings")),
  "Secret providers": m(msg("Secret providers")),
  Secrets: m(msg("Secrets")),
  "Select an ACP or configure one manually.": m(msg("Select an ACP or configure one manually.")),
  "Select the variants you want to remove. You can restore them by importing the extension again.":
    m(
      msg(
        "Select the variants you want to remove. You can restore them by importing the extension again.",
      ),
    ),
  "Send shortcut": m(msg("Send shortcut")),
  "Sensitive values are stored separately and never returned to the app.": m(
    msg("Sensitive values are stored separately and never returned to the app."),
  ),
  "Sensitive, stored separately": m(msg("Sensitive, stored separately")),
  "Separate fonts": m(msg("Separate fonts")),
  "Set how fast panels open and close.": m(msg("Set how fast panels open and close.")),
  "Set how wide messages and the composer can grow on large screens.": m(
    msg("Set how wide messages and the composer can grow on large screens."),
  ),
  "Set on the environment": m(msg("Set on the environment")),
  "Set the prompt, code, and terminal fonts separately instead of one monospace font.": m(
    msg("Set the prompt, code, and terminal fonts separately instead of one monospace font."),
  ),
  "Set whether the diff panel ignores whitespace-only edits by default.": m(
    msg("Set whether the diff panel ignores whitespace-only edits by default."),
  ),
  Settings: m(msg("Settings")),
  "Settings breadcrumb": m(msg("Settings breadcrumb")),
  "Settings search results": m(msg("Settings search results")),
  "Settings sections": m(msg("Settings sections")),
  "Settle a thread when its pull request merges. Closed pull requests still settle automatically.":
    m(
      msg(
        "Settle a thread when its pull request merges. Closed pull requests still settle automatically.",
      ),
    ),
  Setup: m(msg("Setup")),
  "Setup unavailable": m(msg("Setup unavailable")),
  "Shadow home path": m(msg("Shadow home path")),
  "Sharing & access": m(msg("Sharing & access")),
  "Show development artwork in the sidebar header.": m(
    msg("Show development artwork in the sidebar header."),
  ),
  "Show a toast when another thread finishes, fails, or needs input or approval while this app has focus.":
    m(
      msg(
        "Show a toast when another thread finishes, fails, or needs input or approval while this app has focus.",
      ),
    ),
  "Show diffs stacked or side by side. The toggle in the diff toolbar changes this too.": m(
    msg("Show diffs stacked or side by side. The toggle in the diff toolbar changes this too."),
  ),
  "Show finished paragraphs": m(msg("Show finished paragraphs")),
  "Show formatted Markdown as you type.": m(msg("Show formatted Markdown as you type.")),
  "Show key presses in recordings": m(msg("Show key presses in recordings")),
  "Show less": m(msg("Show less", { $context: "settingsCopy.ts" })),
  "Show more": m(msg("Show more")),
  "Show mouse presses in recordings": m(msg("Show mouse presses in recordings")),
  "Show reasoning effort in the composer as its name, such as High, or as bars.": m(
    msg("Show reasoning effort in the composer as its name, such as High, or as bars."),
  ),
  "Show skills in slash menu": m(msg("Show skills in slash menu")),
  "Shown in picker": m(msg("Shown in picker")),
  "Shown in the provider list.": m(msg("Shown in the provider list.")),
  "Shows context window usage as a circular indicator in the composer.": m(
    msg("Shows context window usage as a circular indicator in the composer."),
  ),
  Sidebar: m(msg("Sidebar", { $context: "settingsCopy.ts" })),
  "Sidebar threads with no activity for this long settle automatically.": m(
    msg("Sidebar threads with no activity for this long settle automatically."),
  ),
  "Sign in": m(msg("Sign in")),
  "Sign out": m(msg("Sign out")),
  "Sign-in method": m(msg("Sign-in method")),
  "Signed in as": m(msg("Signed in as")),
  "Signed in.": m(msg("Signed in.")),
  "Simlock device hosts (alpha)": m(msg("Simlock device hosts (alpha)")),
  "Skip for now": m(msg("Skip for now")),
  SnapShots: m(msg("SnapShots")),
  Snooze: m(msg("Snooze", { $context: "settingsCopy.ts" })),
  "Snooze options": m(msg("Snooze options")),
  "Snooze until limits reset": m(msg("Snooze until limits reset")),
  "Something went wrong.": m(msg("Something went wrong.", { $context: "settingsCopy.ts" })),
  Source: m(msg("Source")),
  "Source control": m(msg("Source control")),
  "Source control writer model": m(msg("Source control writer model")),
  "Source control writing style": m(msg("Source control writing style")),
  Split: m(msg("Split")),
  Stacked: m(msg("Stacked", { $context: "settingsCopy.ts" })),
  "Start from remote": m(msg("Start from remote")),
  "Start with files expanded or collapsed when opening diffs or a pull request's Code tab.": m(
    msg("Start with files expanded or collapsed when opening diffs or a pull request's Code tab."),
  ),
  "Starting installation": m(msg("Starting installation")),
  "Starting sign-in…": m(msg("Starting sign-in…")),
  "Starting update": m(msg("Starting update")),
  Status: m(msg("Status")),
  Steer: m(msg("Steer", { $context: "settingsCopy.ts" })),
  "Stored secret, enter a new value to replace": m(
    msg("Stored secret, enter a new value to replace"),
  ),
  Submodules: m(msg("Submodules")),
  System: m(msg("System")),
  "System alerts when a thread finishes, fails, or needs input or approval. Applies to this device while T3 Code is open.":
    m(
      msg(
        "System alerts when a thread finishes, fails, or needs input or approval. Applies to this device while T3 Code is open.",
      ),
    ),
  "System default": m(msg("System default")),
  "System monospace": m(msg("System monospace")),
  "T3 Code does not recognize this condition yet. It can still be saved, but it may not match unless the runtime provides it.":
    m(
      msg(
        "T3 Code does not recognize this condition yet. It can still be saved, but it may not match unless the runtime provides it.",
      ),
    ),
  "T3 Code will restart and start running a server on this computer again.": m(
    msg("T3 Code will restart and start running a server on this computer again."),
  ),
  "T3 Code will restart without running a server on this computer. Any agents and terminals running here will stop, and other devices will no longer be able to connect to this computer. Your projects, history, and remote environments are unaffected.":
    m(
      msg(
        "T3 Code will restart without running a server on this computer. Any agents and terminals running here will stop, and other devices will no longer be able to connect to this computer. Your projects, history, and remote environments are unaffected.",
      ),
    ),

  "Tailscale HTTPS": "Tailscale HTTPS",
  "Terminal font": m(msg("Terminal font")),
  "Terminal font size": m(msg("Terminal font size")),
  "Terminal output, independent from code blocks and diffs.": m(
    msg("Terminal output, independent from code blocks and diffs."),
  ),
  "Text appears once the agent finishes its turn.": m(
    msg("Text appears once the agent finishes its turn."),
  ),
  "Text generation": m(msg("Text generation")),
  "Text generation model": m(msg("Text generation model")),
  "Text generation model not saved": m(msg("Text generation model not saved")),
  "That custom model is already saved.": m(msg("That custom model is already saved.")),
  "That model is already built in.": m(msg("That model is already built in.")),
  "The authentication request expired.": m(msg("The authentication request expired.")),
  "The browser may claim some shortcuts first. The desktop app receives them all.": m(
    msg("The browser may claim some shortcuts first. The desktop app receives them all."),
  ),
  "The configured Antigravity runtime has not been checked.": m(
    msg("The configured Antigravity runtime has not been checked."),
  ),
  "The configured Antigravity runtime is unavailable.": m(
    msg("The configured Antigravity runtime is unavailable."),
  ),
  "The keybinding was not removed.": m(msg("The keybinding was not removed.")),
  "The keybinding was not saved.": m(msg("The keybinding was not saved.")),
  "The keybindings file was not opened.": m(msg("The keybindings file was not opened.")),
  "The most recent matching binding wins when both conditions can apply.": m(
    msg("The most recent matching binding wins when both conditions can apply."),
  ),
  "The provider failed its startup checks.": m(msg("The provider failed its startup checks.")),
  "The provider is installed, but the server could not fully verify it.": m(
    msg("The provider is installed, but the server could not fully verify it."),
  ),
  "The provider sign-in terminal is no longer available.": m(
    msg("The provider sign-in terminal is no longer available."),
  ),
  "The provider update command could not be started.": m(
    msg("The provider update command could not be started."),
  ),
  "The selected targets use different streaming modes.": m(
    msg("The selected targets use different streaming modes."),
  ),
  "The settings update failed.": m(msg("The settings update failed.")),
  "Theme mix": m(msg("Theme mix")),
  Themes: m(msg("Themes")),
  "This connection can view keybindings but cannot change them.": m(
    msg("This connection can view keybindings but cannot change them."),
  ),
  "This driver has no required configuration. You can add the instance now.": m(
    msg("This driver has no required configuration. You can add the instance now."),
  ),
  "This instance uses": m(msg("This instance uses")),
  "This interval is configured here, then the shared Background activity policy decides whether provider probes may run when the timer fires. Custom intervals appear as Advanced in Maintenance settings.":
    m(
      msg(
        "This interval is configured here, then the shared Background activity policy decides whether provider probes may run when the timer fires. Custom intervals appear as Advanced in Maintenance settings.",
      ),
    ),
  "This machine": m(msg("This machine")),
  "This provider instance is no longer available on this device.": m(
    msg("This provider instance is no longer available on this device."),
  ),
  "This provider is installed but disabled for new sessions in T3 Code.": m(
    msg("This provider is installed but disabled for new sessions in T3 Code."),
  ),
  "Thread details": m(msg("Thread details", { $context: "settingsCopy.ts" })),
  "Thread notifications": m(msg("Thread notifications")),
  "Thread title instructions": m(msg("Thread title instructions")),
  Threads: m(msg("Threads", { $context: "settingsCopy.ts" })),
  "Time format": m(msg("Time format")),
  "Timestamp format": m(msg("Timestamp format")),
  Toggle: m(msg("Toggle", { $context: "settingsCopy.ts" })),
  "Toggle account email visibility": m(msg("Toggle account email visibility")),
  "Try again.": m(msg("Try again.", { $context: "settingsCopy.ts" })),
  "Turn off local environment?": m(msg("Turn off local environment?")),
  "Turn on local environment?": m(msg("Turn on local environment?")),
  "Turned off. Agents only run in remote environments.": m(
    msg("Turned off. Agents only run in remote environments."),
  ),
  "Two-line folder rows": m(msg("Two-line folder rows")),
  "Typeset LaTeX math, such as $x^2$ or \\[x^2\\], in messages and Markdown previews. The composer keeps TeX source editable.":
    m(
      msg(
        "Typeset LaTeX math, such as $x^2$ or \\[x^2\\], in messages and Markdown previews. The composer keeps TeX source editable.",
      ),
    ),
  Typography: m(msg("Typography")),
  "Unable to open keybindings file": m(
    msg("Unable to open keybindings file", { $context: "settingsCopy.ts" }),
  ),
  "Unable to remove keybinding": m(msg("Unable to remove keybinding")),
  "Unable to save keybinding": m(msg("Unable to save keybinding")),
  Unassigned: m(msg("Unassigned")),
  Unavailable: m(msg("Unavailable")),
  "Unpin confirmation": m(msg("Unpin confirmation")),
  Unsupported: m(msg("Unsupported")),
  "Unsupported version": m(msg("Unsupported version")),
  "Update Antigravity": m(msg("Update Antigravity")),
  "Update available": m(msg("Update available")),
  "Update check failed.": m(msg("Update check failed.")),
  "Update confirmation failed.": m(msg("Update confirmation failed.")),
  "Update for full support.": m(msg("Update for full support.")),
  "Update now": m(msg("Update now")),
  "Update required": m(msg("Update required")),
  "Update this environment to manage Antigravity.": m(
    msg("Update this environment to manage Antigravity."),
  ),
  Updates: m(msg("Updates")),
  "Usage limits": m(msg("Usage limits")),
  "Usage providers": m(msg("Usage providers")),
  "Use devices": m(msg("Use devices")),
  "Use for both light and dark": m(msg("Use for both light and dark")),
  "Use the first variants for light and dark": m(msg("Use the first variants for light and dark")),
  "Use thinner grayscale text smoothing instead of the macOS default.": m(
    msg("Use thinner grayscale text smoothing instead of the macOS default."),
  ),
  "Used for new threads when the default model's provider is out of usage.": m(
    msg("Used for new threads when the default model's provider is out of usage."),
  ),
  "Used for thread titles and other generated text on connected devices with this provider. Source control can override it.":
    m(
      msg(
        "Used for thread titles and other generated text on connected devices with this provider. Source control can override it.",
      ),
    ),
  "Uses the custom binary path below. Installation keeps that path.": m(
    msg("Uses the custom binary path below. Installation keeps that path."),
  ),
  "Using CURSOR_API_KEY. Remove it from this provider's environment to use browser sign-in.": m(
    msg("Using CURSOR_API_KEY. Remove it from this provider's environment to use browser sign-in."),
  ),
  Variables: m(msg("Variables")),
  Version: m(msg("Version")),
  "Version pill": m(msg("Version pill")),
  "View diagnostics": m(msg("View diagnostics")),
  "View licenses": m(msg("View licenses")),
  "View policy": m(msg("View policy")),
  "WSL backend": m(msg("WSL backend")),
  "Wait for the full response": m(msg("Wait for the full response")),
  "Waiting for the server to report installation and authentication details.": m(
    msg("Waiting for the server to report installation and authentication details."),
  ),
  When: m(msg("When")),
  "When expression": m(msg("When expression")),
  "When to compact an idle Claude thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Each Claude provider can override this.":
    m(
      msg(
        "When to compact an idle Claude thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Each Claude provider can override this.",
      ),
    ),
  "Where new threads in this project start.": m(msg("Where new threads in this project start.")),
  "Where new threads start. Projects and their liverary.json can override it.": m(
    msg("Where new threads start. Projects and their liverary.json can override it."),
  ),
  Wide: m(msg("Wide")),
  Word: m(msg("Word")),
  "Word (default)": m(msg("Word (default)")),
  "Word wrap": m(msg("Word wrap")),
  "Working section": m(msg("Working section")),
  Workspace: m(msg("Workspace")),
  "Worktree branch naming": m(msg("Worktree branch naming")),
  "Worktree cleanup": m(msg("Worktree cleanup")),
  "Worktree location": m(msg("Worktree location")),
  "Worktree submodules": m(msg("Worktree submodules")),
  Worktrees: m(msg("Worktrees")),
  "Wrap code, diffs, and file previews by default": m(
    msg("Wrap code, diffs, and file previews by default"),
  ),
  "Wrap long lines in code blocks, diffs, and file previews by default.": m(
    msg("Wrap long lines in code blocks, diffs, and file previews by default."),
  ),
  "You can bring it back anytime by importing its JSON file.": m(
    msg("You can bring it back anytime by importing its JSON file."),
  ),
  "add project base directory": m(msg("add project base directory")),
  "agent credit removal": m(msg("agent credit removal")),
  and: m(msg("and")),
  "archive confirmation": m(msg("archive confirmation")),
  "auto-settle": m(msg("Auto-settle")),
  "auto-settle on merge": m(msg("auto-settle on merge")),
  "chat width": m(msg("chat width")),
  "compact idle threads": m(msg("compact idle threads")),
  "composer context": m(msg("composer context")),
  "continue threads after restarts": m(msg("continue threads after restarts")),
  contrast: m(msg("Contrast")),
  custom: m(msg("Custom")),
  default: m(msg("Default")),
  "default automatic pull": m(msg("default automatic pull")),
  "default diff file state": m(msg("default diff file state")),
  "default merge method": m(msg("default merge method")),
  "default model": m(msg("default model")),
  "default permissions": m(msg("default permissions")),
  "default workspace": m(msg("default workspace")),
  "delete confirmation": m(msg("delete confirmation")),
  "diff colors": m(msg("diff colors")),
  "diff layout": m(msg("diff layout")),
  "diff whitespace changes": m(msg("diff whitespace changes")),
  "e.g. Work": m(msg("e.g. Work")),
  "e.g. dsh": m(msg("e.g. dsh")),
  "effort display": m(msg("effort display")),
  "environment identification": m(msg("environment identification")),
  "fallback model": m(msg("fallback model")),
  "follow-up behavior": m(msg("follow-up behavior")),
  "font smoothing": m(msg("font smoothing")),
  "glass opacity": m(msg("glass opacity")),
  "in your browser.": m(msg("in your browser.")),
  "math rendering": m(msg("math rendering")),
  model: m(msg("Model")),
  "new keybinding": m(msg("new keybinding")),
  or: m(msg("or")),
  "or, update manually using": m(msg("or, update manually using")),
  override: m(msg("override")),
  "panel animations": m(msg("panel animations")),
  "proactive panels": m(msg("proactive panels")),
  "project grouping": m(msg("project grouping")),
  "project order": m(msg("project order")),
  "provider health check interval": m(msg("provider health check interval")),
  "provider update checks": m(msg("provider update checks")),
  "quit shortcut behavior": m(msg("quit shortcut behavior")),
  "response streaming": m(msg("response streaming")),
  "rich text composer": m(msg("rich text composer")),
  seconds: m(msg("seconds")),
  "send shortcut": m(msg("send shortcut")),
  "skills in slash menu": m(msg("skills in slash menu")),
  "t3 command": "Liverary CLI",
  "text generation model": m(msg("text generation model")),
  "time format": m(msg("time format")),
  "unpin confirmation": m(msg("unpin confirmation")),
  value: m(msg("Value")),
  "word wrapping": m(msg("word wrapping")),
  "working section": m(msg("working section")),
  "worktree submodules": m(msg("worktree submodules")),
  "the selected environment": m(msg("the selected environment")),
  "the primary environment": m(msg("the primary environment")),
  "Reset all": m(msg("Reset all")),
  Updating: m(msg("Updating")),
  "Clear all conditions": m(msg("Clear all conditions")),
  "Remove condition": m(msg("Remove condition")),
  "Remove group and its conditions": m(msg("Remove group and its conditions")),
  "Use variables with !, &&, ||, and parentheses.": m(
    msg("Use variables with !, &&, ||, and parentheses."),
  ),
  Navigation: m(msg("Navigation")),
  Terminal: m(msg("Terminal")),
  "Preview & diff": m(msg("Preview & diff")),
  "Project scripts": m(msg("Project scripts")),
  Other: m(msg("Other")),
  "Korean default": m(msg("Korean default")),
  "Korean default follows the Korean time format and your device time zone.": m(
    msg("Korean default follows the Korean time format and your device time zone."),
  ),
  "Queue follow-ups while the agent runs or steer the current run.": m(
    msg("Queue follow-ups while the agent runs or steer the current run."),
  ),
  "Installed.": m(msg("Installed.")),
  Favorites: m(msg("Favorites")),
  "Browser viewport": m(msg("Browser viewport")),
  "Browser zoom": m(msg("Browser zoom")),
  "Browser appearance": m(msg("Browser appearance")),
  "Recording frame rate": m(msg("Recording frame rate")),
  "Recording key presses": m(msg("Recording key presses")),
  "Recording mouse presses": m(msg("Recording mouse presses")),
  "Floating preview": m(msg("Floating preview")),
  "Failed to import action.": m(msg("Failed to import action.")),
  "Commands that run in this project's checkout or its worktree, with optional shortcuts.": m(
    msg("Commands that run in this project's checkout or its worktree, with optional shortcuts."),
  ),
  "Import scripts": m(msg("Import scripts")),
  "Import from project configuration": m(msg("Import from project configuration")),
  "Project configuration file": m(msg("Project configuration file")),
  "Add actions declared by this checkout without editing them first.": m(
    msg("Add actions declared by this checkout without editing them first."),
  ),
  "Add action": m(msg("Add action")),
  "Different actions across checkouts": m(msg("Different actions across checkouts")),
  "Narrow the selection above to one checkout to edit its list. Adding an action here adds it to every selected checkout.":
    m(
      msg(
        "Narrow the selection above to one checkout to edit its list. Adding an action here adds it to every selected checkout.",
      ),
    ),
  "Project configuration file is invalid": m(msg("Project configuration file is invalid")),
  "Could not read project configuration file": m(msg("Could not read project configuration file")),
  "The project configuration file could not be parsed, so its actions and icon are ignored. Check the JSON syntax and icon values.":
    m(
      msg(
        "The project configuration file could not be parsed, so its actions and icon are ignored. Check the JSON syntax and icon values.",
      ),
    ),
  "No actions configured.": m(msg("No actions configured.")),
  setup: m(msg("setup")),
  "on settle": m(msg("on settle")),
  "preview · desktop only": m(msg("preview · desktop only")),
  "Could not load linked environments": m(msg("Could not load linked environments")),
  "Loading linked environments…": m(msg("Loading linked environments…")),
  "No linked environments": m(msg("No linked environments")),
  "Link another machine running T3 Code, such as a VPS, so agents here can launch and drive threads there.":
    m(
      msg(
        "Link another machine running T3 Code, such as a VPS, so agents here can launch and drive threads there.",
      ),
    ),
  "Could not forget the link": m(msg("Could not forget the link")),
  "Expired. Link it again with a new pairing code.": m(
    msg("Expired. Link it again with a new pairing code."),
  ),
  "Not answering right now.": m(msg("Not answering right now.")),
  Reachable: m(msg("Reachable")),
  "Forgetting…": m(msg("Forgetting…")),
  Forget: m(msg("Forget")),
  "Could not link the environment": m(msg("Could not link the environment")),
  Link: m(msg("Link")),
  "Linking…": m(msg("Linking…")),
  "Link an environment": m(msg("Link an environment")),
  "Agents here can then launch, message and wait on threads there. It appears under Authorized clients in that environment's Sharing & access, where it can be revoked.":
    m(
      msg(
        "Agents here can then launch, message and wait on threads there. It appears under Authorized clients in that environment's Sharing & access, where it can be revoked.",
      ),
    ),
  "Already linked. Linking again renews it with the access you pick.": m(
    msg("Already linked. Linking again renews it with the access you pick."),
  ),
  Address: m(msg("Address")),
  "Pairing code": m(msg("Pairing code", { $context: "settingsCopy.ts" })),
  "From Sharing & access there, or liverary pair": m(
    msg("From Sharing & access there, or liverary pair"),
  ),
  "Paste the code": m(msg("Paste the code", { $context: "settingsCopy.ts" })),
  "Add a project from the sidebar to configure it here.": m(
    msg("Add a project from the sidebar to configure it here."),
  ),
  "This project is no longer available.": m(msg("This project is no longer available.")),
  "This checkout is no longer available in the selected project and environment.": m(
    msg("This checkout is no longer available in the selected project and environment."),
  ),
  "Project title cannot be empty": m(msg("Project title cannot be empty")),
  "Failed to rename project": m(msg("Failed to rename project")),
  "Failed to update project icon": m(msg("Failed to update project icon")),
  "Failed to remove project": m(msg("Failed to remove project")),
  Checkouts: m(msg("Checkouts")),
  "Can't find a setting? Keep this project picked above and hop to any other settings page.": m(
    msg("Can't find a setting? Keep this project picked above and hop to any other settings page."),
  ),
  "Shared settings require permission to change every checkout in this group.": m(
    msg("Shared settings require permission to change every checkout in this group."),
  ),
  "This connection cannot change this project.": m(
    msg("This connection cannot change this project."),
  ),
  Name: m(msg("Name")),
  "The shared name for this project group in the sidebar and thread lists.": m(
    msg("The shared name for this project group in the sidebar and thread lists."),
  ),
  "project name": m(msg("project name")),
  "Project name": m(msg("Project name")),
  "Project icon": m(msg("Project icon")),
  "project icon": m(msg("project icon")),
  "Choose a project icon": m(msg("Choose a project icon")),
  "Choose icon": m(msg("Choose icon")),
  "Choose a project icon file": m(msg("Choose a project icon file")),
  "Choose file": m(msg("Choose file")),
  Pin: m(msg("Pin")),
  "Pinned projects come first in project pickers.": m(
    msg("Pinned projects come first in project pickers."),
  ),
  "Failed to pin project": m(msg("Failed to pin project")),
  "Failed to unpin project": m(msg("Failed to unpin project")),
  "Pin project": m(msg("Pin project")),
  "Project archive": m(msg("Project archive")),
  "Archive project": m(msg("Archive project")),
  "Unarchive project": m(msg("Unarchive project")),
  "Hidden from project pickers. Threads and files are kept.": m(
    msg("Hidden from project pickers. Threads and files are kept."),
  ),
  "Hides the project from project pickers. Threads and files are kept.": m(
    msg("Hides the project from project pickers. Threads and files are kept."),
  ),
  "Failed to unarchive project": m(msg("Failed to unarchive project")),
  "Failed to archive project": m(msg("Failed to archive project")),
  Danger: m(msg("Danger")),
  "Remove checkout": m(msg("Remove checkout")),
  "Remove this project everywhere": m(msg("Remove this project everywhere")),
  "Remove project": m(msg("Remove project", { $context: "settingsCopy.ts" })),
  "Deletes the selected machine's checkout entries and their threads. Other machines and files on disk are not touched.":
    m(
      msg(
        "Deletes the selected machine's checkout entries and their threads. Other machines and files on disk are not touched.",
      ),
    ),
  "Deletes the project entry and its threads. Files on disk are not touched.": m(
    msg("Deletes the project entry and its threads. Files on disk are not touched."),
  ),
  "Remove all entries": m(msg("Remove all entries")),
  "Failed to update network exposure.": m(msg("Failed to update network exposure.")),
  "Could not update network access": m(msg("Could not update network access")),
  "Failed to configure Tailscale HTTPS.": m(msg("Failed to configure Tailscale HTTPS.")),
  "Could not set up Tailscale HTTPS": m(msg("Could not set up Tailscale HTTPS")),
  "Failed to disable Tailscale HTTPS.": m(msg("Failed to disable Tailscale HTTPS.")),
  "Could not disable Tailscale HTTPS": m(msg("Could not disable Tailscale HTTPS")),
  "Failed to revoke pairing link.": m(msg("Failed to revoke pairing link.")),
  "Could not revoke pairing link": m(msg("Could not revoke pairing link")),
  "Failed to revoke client access.": m(msg("Failed to revoke client access.")),
  "Could not revoke client access": m(msg("Could not revoke client access")),
  "Other paired clients will need a new pairing link before reconnecting.": m(
    msg("Other paired clients will need a new pairing link before reconnecting."),
  ),
  "Failed to revoke other clients.": m(msg("Failed to revoke other clients.")),
  "Could not revoke other clients": m(msg("Could not revoke other clients")),
  "Failed to remove backend.": m(msg("Failed to remove backend.")),
  "Could not remove backend": m(msg("Could not remove backend")),
  "Enable network access": m(msg("Enable network access")),
  "Failed to update WSL backend.": m(msg("Failed to update WSL backend.")),
  "Could not change WSL backend": m(msg("Could not change WSL backend")),
  "Couldn't load the WSL backend state.": m(msg("Couldn't load the WSL backend state.")),
  "Retrying…": m(msg("Retrying…")),
  Retry: m(msg("Retry")),
  "WSL is unavailable, so Windows is running instead. Turn WSL off to clear this preference.": m(
    msg(
      "WSL is unavailable, so Windows is running instead. Turn WSL off to clear this preference.",
    ),
  ),
  "Switch to Windows": m(msg("Switch to Windows")),
  "Default distro": m(msg("Default distro")),
  "Run the selected WSL distro alongside Windows. Projects remain on their current filesystem.": m(
    msg(
      "Run the selected WSL distro alongside Windows. Projects remain on their current filesystem.",
    ),
  ),
  " (default)": m(msg(" (default)")),
  "WSL only": m(msg("WSL only")),
  "Run only the WSL backend. T3 Code restarts when this changes.": m(
    msg("Run only the WSL backend. T3 Code restarts when this changes."),
  ),
  "Run WSL only": m(msg("Run WSL only")),
  "Use Tailscale Serve to expose this backend through a MagicDNS HTTPS URL.": m(
    msg("Use Tailscale Serve to expose this backend through a MagicDNS HTTPS URL."),
  ),
  "Enable Tailscale HTTPS": m(msg("Enable Tailscale HTTPS")),
  "Exposed on all interfaces.": m(msg("Exposed on all interfaces.")),
  "Limited to this machine.": m(msg("Limited to this machine.")),
  "Loading…": m(msg("Loading…")),
  "This connection cannot view or change network exposure.": m(
    msg("This connection cannot view or change network exposure."),
  ),
  "Remote access is already configured. Change network exposure where the server starts.": m(
    msg("Remote access is already configured. Change network exposure where the server starts."),
  ),
  "Only this machine can connect. Restart with a non-loopback host for remote pairing.": m(
    msg("Only this machine can connect. Restart with a non-loopback host for remote pairing."),
  ),
  "Network exposure information is unavailable.": m(
    msg("Network exposure information is unavailable."),
  ),
  "Network exposure changes restart the backend and must be controlled where the server process is launched.":
    m(
      msg(
        "Network exposure changes restart the backend and must be controlled where the server process is launched.",
      ),
    ),
  "Primary environment": m(msg("Primary environment")),
  "More actions for this machine": m(msg("More actions for this machine")),
  "Retry update": m(msg("Retry update")),
  "Authorized clients": m(msg("Authorized clients")),
  "This connection can create access links but cannot view authorized clients.": m(
    msg("This connection can create access links but cannot view authorized clients."),
  ),
  "Enable network access?": m(msg("Enable network access?")),
  "Disable network access?": m(msg("Disable network access?")),
  "Let your other devices connect to T3 Code over the network. Pair devices to give them access. T3 Code will restart.":
    m(
      msg(
        "Let your other devices connect to T3 Code over the network. Pair devices to give them access. T3 Code will restart.",
      ),
    ),
  "Devices connected over your local network will disconnect. Existing tunnels, such as Tailscale HTTPS, keep working. Liverary will restart.":
    m(
      msg(
        "Devices connected over your local network will disconnect. Existing tunnels, such as Tailscale HTTPS, keep working. Liverary will restart.",
      ),
    ),
  "Restart and enable": m(msg("Restart and enable")),
  "Restart and disable": m(msg("Restart and disable")),
  "Turn off WSL and switch back to Windows?": m(msg("Turn off WSL and switch back to Windows?")),
  "Disable WSL backend?": m(msg("Disable WSL backend?")),
  "Switch WSL distro?": m(msg("Switch WSL distro?")),
  "Start the WSL backend": m(msg("Start the WSL backend")),
  "Run only the WSL backend?": m(msg("Run only the WSL backend?")),
  "Re-enable the Windows backend?": m(msg("Re-enable the Windows backend?")),
  "T3 Code will restart on the Windows backend. Threads and projects opened against WSL stay safe inside the distro and become available again when you re-enable WSL.":
    m(
      msg(
        "T3 Code will restart on the Windows backend. Threads and projects opened against WSL stay safe inside the distro and become available again when you re-enable WSL.",
      ),
    ),
  "The WSL backend will stop. Threads and projects opened against WSL stay safe inside the distro, but they'll be unavailable in T3 Code until you re-enable WSL.":
    m(
      msg(
        "The WSL backend will stop. Threads and projects opened against WSL stay safe inside the distro, but they'll be unavailable in T3 Code until you re-enable WSL.",
      ),
    ),
  "T3 Code will restart the WSL backend on the new distro. Sessions still running on the current distro will be interrupted.":
    m(
      msg(
        "T3 Code will restart the WSL backend on the new distro. Sessions still running on the current distro will be interrupted.",
      ),
    ),
  "Run the WSL backend alongside the Windows one, or stop the Windows backend and use only WSL? You can change this later from Settings.":
    m(
      msg(
        "Run the WSL backend alongside the Windows one, or stop the Windows backend and use only WSL? You can change this later from Settings.",
      ),
    ),
  "T3 Code will restart and start only the WSL backend. Your Windows-side projects won't be accessible until you turn this off again.":
    m(
      msg(
        "T3 Code will restart and start only the WSL backend. Your Windows-side projects won't be accessible until you turn this off again.",
      ),
    ),
  "T3 Code will restart and bring the Windows backend back up alongside WSL.": m(
    msg("T3 Code will restart and bring the Windows backend back up alongside WSL."),
  ),
  "Applying…": m(msg("Applying…")),
  "Use only WSL": m(msg("Use only WSL")),
  "Run both backends": m(msg("Run both backends")),
  "Disable WSL": m(msg("Disable WSL")),
  "Switch distro": m(msg("Switch distro")),
  "Disable Tailscale HTTPS?": m(msg("Disable Tailscale HTTPS?")),
  "T3 Code will restart the local backend without Tailscale Serve.": m(
    msg("T3 Code will restart the local backend without Tailscale Serve."),
  ),
  "Set up Tailscale HTTPS?": m(msg("Set up Tailscale HTTPS?")),
  "T3 Code will restart the local backend with Tailscale Serve enabled and ask Tailscale to proxy HTTPS traffic to this backend.":
    m(
      msg(
        "T3 Code will restart the local backend with Tailscale Serve enabled and ask Tailscale to proxy HTTPS traffic to this backend.",
      ),
    ),
  "HTTPS port": m(msg("HTTPS port")),
  "Enter a port from 1 to 65535.": m(msg("Enter a port from 1 to 65535.")),
  "HTTPS endpoint": m(msg("HTTPS endpoint")),
  "Pending MagicDNS endpoint": m(msg("Pending MagicDNS endpoint")),
  Enable: m(msg("Enable")),
  "No environment selected": m(msg("No environment selected")),
  "Connect an environment to view its settings and access.": m(
    msg("Connect an environment to view its settings and access."),
  ),
  "This app": m(msg("This app")),
  Server: m(msg("Server")),
  "Mobile devices that get notifications from your environments.": m(
    msg("Mobile devices that get notifications from your environments."),
  ),
  Failures: m(msg("Failures")),
  Refresh: m(msg("Refresh")),
  "Could not reach the server": m(msg("Could not reach the server")),
  "You cannot check secrets on this environment": m(
    msg("You cannot check secrets on this environment"),
  ),
  "Check that the secret resolves": m(msg("Check that the secret resolves")),
  "Checking the secret": m(msg("Checking the secret")),
  "Secret resolved": m(msg("Secret resolved")),
  "Expo Simulators": m(msg("Expo Simulators")),
  "Waiting for approval": m(msg("Waiting for approval")),
  "This provider is not available on this environment.": m(
    msg("This provider is not available on this environment."),
  ),
  "save source control providers": m(msg("save source control providers")),
  "Offer when adding or publishing a project": m(msg("Offer when adding or publishing a project")),
  "Saved on this device. Select All projects to change it.": m(
    msg("Saved on this device. Select All projects to change it."),
  ),
  "Writer model not saved": m(msg("Writer model not saved")),
  "Enter a valid value. It was not saved.": m(msg("Enter a valid value. It was not saved.")),
  "Expo host not removed everywhere": m(msg("Expo host not removed everywhere")),
  "Expo host not saved everywhere": m(msg("Expo host not saved everywhere")),
  Preferences: m(msg("Preferences")),
  "Screen reader window title": m(msg("Screen reader window title")),
  "Streaming transcription": m(msg("Streaming transcription")),
  "Keep awake while agents work": m(msg("Keep awake while agents work")),
  "No microphone found.": m(msg("No microphone found.")),
  Stop: m(msg("Stop", { $context: "settingsCopy.ts" })),
  Record: m(msg("Record")),
  "Record ten seconds and play it back. The audio stays on this device.": m(
    msg("Record ten seconds and play it back. The audio stays on this device."),
  ),
  "Discard recording": m(msg("Discard recording")),
  "Sampling on demand": m(msg("Sampling on demand")),
  "Screen reader": m(msg("Screen reader")),
  "Start the window title with the thread's status, like Needs approval, and its name, so screen readers read them first when you switch apps. Taskbars, shared screens, and time trackers see it too.":
    m(
      msg(
        "Start the window title with the thread's status, like Needs approval, and its name, so screen readers read them first when you switch apps. Taskbars, shared screens, and time trackers see it too.",
      ),
    ),
  "screen reader window title": m(msg("screen reader window title")),
  "Stop the computer from going to sleep while agents are working, and let it sleep once they finish. Closing a laptop lid still puts it to sleep.":
    m(
      msg(
        "Stop the computer from going to sleep while agents are working, and let it sleep once they finish. Closing a laptop lid still puts it to sleep.",
      ),
    ),
  "keep awake while agents work": m(msg("keep awake while agents work")),
  "Add words, separated by commas": m(msg("Add words, separated by commas")),
  "Drop “um” and “uh” from transcripts.": m(msg("Drop “um” and “uh” from transcripts.")),
  Fastest: m(msg("Fastest")),
  "Fix punctuation, numbers, lists, and spoken corrections.": m(
    msg("Fix punctuation, numbers, lists, and spoken corrections."),
  ),
  Instructions: m(msg("Instructions")),
  "Most accurate": m(msg("Most accurate")),
  "Names and terms to spell your way, saved on this device.": m(
    msg("Names and terms to spell your way, saved on this device."),
  ),
  "Off by default. Sends the transcript and nearby draft text, never audio, to the cleanup model.":
    m(
      msg(
        "Off by default. Sends the transcript and nearby draft text, never audio, to the cleanup model.",
      ),
    ),
  "OpenAI handles silence itself.": m(msg("OpenAI handles silence itself.")),
  "Record while held": m(msg("Record while held")),
  "Say a sentence. Cleanup is skipped, so you see exactly what the model heard.": m(
    msg("Say a sentence. Cleanup is skipped, so you see exactly what the model heard."),
  ),
  "Skip silence and background noise before transcribing.": m(
    msg("Skip silence and background noise before transcribing."),
  ),
  Smallest: m(msg("Smallest")),
  "Tap to start, tap to stop": m(msg("Tap to start, tap to stop")),
  "Tap to toggle, hold to talk": m(msg("Tap to toggle, hold to talk")),
  "The phrase you say to fix a mistake, like “scratch that”.": m(
    msg("The phrase you say to fix a mistake, like “scratch that”."),
  ),
  "The provider detects your language automatically.": m(
    msg("The provider detects your language automatically."),
  ),
  "This model doesn’t support native streaming.": m(
    msg("This model doesn’t support native streaming."),
  ),
  "Transcribe while recording. Turn off to transcribe after stopping, which may help when live transcription falls behind.":
    m(
      msg(
        "Transcribe while recording. Turn off to transcribe after stopping, which may help when live transcription falls behind.",
      ),
    ),
  "Used by everyone who dictates on this environment.": m(
    msg("Used by everyone who dictates on this environment."),
  ),
  "Voice input uses the first connected microphone in this list.": m(
    msg("Voice input uses the first connected microphone in this list."),
  ),
  "Where your speech is turned into text.": m(msg("Where your speech is turned into text.")),
  "Your dictionary": m(msg("Your dictionary")),
  "Your own instructions for cleanup.": m(msg("Your own instructions for cleanup.")),
  "Saved microphone": m(msg("Saved microphone")),
  "Microphones, preferred first": m(msg("Microphones, preferred first")),
  "This sign-in link is not a web address, so it was not opened.": m(
    msg("This sign-in link is not a web address, so it was not opened."),
  ),
  "in checkout": m(msg("in checkout")),
  "Checkout scope": m(msg("Checkout scope")),
  "Unavailable checkout": m(msg("Unavailable checkout")),
  "Search checkouts": m(msg("Search checkouts")),
  "Custom CSS": m(msg("Custom CSS")),
  "Tab indents. Shift+Tab unindents. Press Escape, then Tab to leave.": m(
    msg("Tab indents. Shift+Tab unindents. Press Escape, then Tab to leave."),
  ),
  "Tab moves to the next control.": m(msg("Tab moves to the next control.")),
  "Clear CSS": m(msg("Clear CSS")),
  "Saved with this theme and included when you export it. Web and desktop only. Rules that load remote files are ignored.":
    m(
      msg(
        "Saved with this theme and included when you export it. Web and desktop only. Rules that load remote files are ignored.",
      ),
    ),
} as const;

export const keybindingLabels = {
  "workspace.focusNext": m(msg("Focus Next Workspace Area")),
  "workspace.focusPrevious": m(msg("Focus Previous Workspace Area")),
  "sidebar.toggle": m(msg("Sidebar: Toggle")),
  "navigation.back": m(msg("Navigation: Back")),
  "navigation.forward": m(msg("Navigation: Forward")),
  "terminal.toggle": m(msg("Terminal: Toggle")),
  "terminal.split": m(msg("Terminal: Split")),
  "terminal.splitVertical": m(msg("Terminal: Split Vertical")),
  "terminal.new": m(msg("Terminal: New")),
  "terminal.close": m(msg("Terminal: Close")),
  "rightPanel.toggle": m(msg("Right Panel: Toggle")),
  "rightPanel.new": m(msg("Right Panel: New")),
  "threadPanel.toggle": m(msg("Thread Panel: Toggle")),
  "rightPanel.toggleMaximized": m(msg("Right Panel: Toggle Maximized")),
  "rightPanel.close": m(msg("Right Panel: Close")),
  "view.reopenClosed": m(msg("View: Reopen Closed")),
  "pullRequest.copyNumber": m(msg("Pull Request: Copy Number")),
  "diff.toggle": m(msg("Diff: Toggle")),
  "preview.toggle": m(msg("Preview: Toggle")),
  "preview.refresh": m(msg("Preview: Refresh")),
  "preview.focusUrl": m(msg("Preview: Focus Url")),
  "preview.find": m(msg("Preview: Find on Page")),
  "preview.zoomIn": m(msg("Preview: Zoom In")),
  "preview.zoomOut": m(msg("Preview: Zoom Out")),
  "preview.resetZoom": m(msg("Preview: Reset Zoom")),
  "commandPalette.toggle": m(msg("Command Palette: Toggle")),
  "filePicker.toggle": m(msg("File Picker: Toggle")),
  "projectSearch.toggle": m(msg("Project Search: Toggle")),
  "usage.open": m(msg("Usage: Open")),
  "theme.select": m(msg("Theme: Select")),
  "appearance.cycle": m(msg("Appearance: Cycle")),
  "themeEditor.toggle": m(msg("Theme Editor: Toggle")),
  "composer.stash": m(msg("Composer: Stash")),
  "composer.sendAlternate": m(msg("Composer: Opposite Queue or Steer Action")),
  "composer.dictation": m(msg("Composer: Start or Finish Dictation")),
  "composer.sendBackground": m(msg("Composer: Start in Background")),
  "composer.sendAndNewThread": m(msg("Composer: Send And New Thread")),
  "composer.host": m(msg("Composer: Host")),
  "composer.cycleHost": m(msg("Composer: Cycle Host")),
  "composer.effort": m(msg("Composer: Effort")),
  "composer.increaseEffort": m(msg("Composer: Increase Effort")),
  "composer.decreaseEffort": m(msg("Composer: Decrease Effort")),
  "composer.mode": m(msg("Composer: Mode")),
  "composer.workspace": m(msg("Composer: Workspace")),
  "composer.previousWorktree": m(msg("Composer: Previous Worktree")),
  "composer.branch": m(msg("Composer: Branch")),
  "chat.new": m(msg("Chat: New")),
  "chat.newLocal": m(msg("Chat: New Local")),
  "chat.newWithoutProject": m(msg("Chat: New Without Project")),
  "chat.find": m(msg("Chat: Find")),
  "editor.openFavorite": m(msg("Editor: Open Favorite")),
  "usage.cost": m(msg("Usage: Cost")),
  "usage.tokens": m(msg("Usage: Tokens")),
  "usage.limits": m(msg("Usage: Limits")),
  "usage.period.day": m(msg("Usage: Period: Past 24h")),
  "usage.period.week": m(msg("Usage: Period: Week")),
  "usage.period.month": m(msg("Usage: Period: Month")),
  "usage.period.quarter": m(msg("Usage: Period: Quarter")),
  "modelPicker.toggle": m(msg("Model Picker: Toggle")),
  "modelPicker.previousProvider": m(msg("Model Picker: Previous Provider")),
  "modelPicker.nextProvider": m(msg("Model Picker: Next Provider")),
  "thread.regenerateTitle": m(msg("Thread: Regenerate Title")),
  "thread.stop": m(msg("Thread: Stop")),
  "thread.steerQueuedMessage": m(msg("Queue: Send First Queued Message")),
  "thread.editQueuedMessage": m(msg("Queue: Edit Last Queued Message")),
  "thread.previous": m(msg("Thread: Previous")),
  "thread.next": m(msg("Thread: Next")),
  "thread.copyReference": m(msg("Pull Request: Copy Link or Thread")),
  "thread.settle": m(msg("Thread: Settle")),
  "thread.pin": m(msg("Thread: Pin")),
  "thread.undo": m(msg("Thread: Undo")),
  "thread.jump.1": m(msg("Thread: Jump: 1")),
  "modelPicker.jump.1": m(msg("Model Picker: Jump: 1")),
  "thread.jump.2": m(msg("Thread: Jump: 2")),
  "modelPicker.jump.2": m(msg("Model Picker: Jump: 2")),
  "thread.jump.3": m(msg("Thread: Jump: 3")),
  "modelPicker.jump.3": m(msg("Model Picker: Jump: 3")),
  "thread.jump.4": m(msg("Thread: Jump: 4")),
  "modelPicker.jump.4": m(msg("Model Picker: Jump: 4")),
  "thread.jump.5": m(msg("Thread: Jump: 5")),
  "modelPicker.jump.5": m(msg("Model Picker: Jump: 5")),
  "thread.jump.6": m(msg("Thread: Jump: 6")),
  "modelPicker.jump.6": m(msg("Model Picker: Jump: 6")),
  "thread.jump.7": m(msg("Thread: Jump: 7")),
  "modelPicker.jump.7": m(msg("Model Picker: Jump: 7")),
  "thread.jump.8": m(msg("Thread: Jump: 8")),
  "modelPicker.jump.8": m(msg("Model Picker: Jump: 8")),
  "thread.jump.9": m(msg("Thread: Jump: 9")),
  "modelPicker.jump.9": m(msg("Model Picker: Jump: 9")),
} as const satisfies Record<(typeof STATIC_KEYBINDING_COMMANDS)[number], string>;

export function localizeSettingsText(text: string): string {
  if (Object.hasOwn(settingsSourceMessages, text))
    return settingsSourceMessages[text as keyof typeof settingsSourceMessages];
  const piLogin = /^Pi has no usable models\. (.+)$/.exec(text);
  if (piLogin)
    return m(
      msg("Pi has no usable models. {value0}", {
        value0: String(localizeSettingsText(piLogin[1]!)),
      }),
    );
  const piModelLogin =
    /^Pi default \((.+)\) has no credentials configured for (.+)\. Choose another model\. (.+)$/.exec(
      text,
    );
  if (piModelLogin)
    return m(
      msg(
        "Pi default ({value0}) has no credentials configured for {value1}. Choose another model. {value2}",
        {
          value0: String(piModelLogin[1]),
          value1: String(piModelLogin[2]),
          value2: String(localizeSettingsText(piModelLogin[3]!)),
        },
      ),
    );
  const tunnel = /^Tunnel connected(?: · (\d+) connections?)?(?: · (.+))?$/.exec(text);
  if (tunnel)
    return [
      m(msg("Tunnel connected")),
      ...(tunnel[1] ? [m(msg("{value0} connections", { value0: String(tunnel[1]) }))] : []),
      ...(tunnel[2] ? [tunnel[2]] : []),
    ].join(" · ");
  const edgePort = /^Cloudflare's tunnel port \((\d+)\) times out from this machine\.$/.exec(text);
  if (edgePort)
    return m(
      msg("Cloudflare's tunnel port ({value0}) times out from this machine.", {
        value0: String(edgePort[1]),
      }),
    );
  const exitNode =
    /^Tailscale exit node(?: "(.+)")? is on\. Traffic to Cloudflare goes through it\.$/.exec(text);
  if (exitNode)
    return m(
      msg("Tailscale exit node{value0} is on. Traffic to Cloudflare goes through it.", {
        value0: String(exitNode[1] ? ` “${exitNode[1]}”` : ""),
      }),
    );
  const allowPort =
    /^Allow outbound TCP and UDP port (\d+), or turn off the VPN or firewall that blocks it\.$/.exec(
      text,
    );
  if (allowPort)
    return m(
      msg(
        "Allow outbound TCP and UDP port {value0}, or turn off the VPN or firewall that blocks it.",
        { value0: String(allowPort[1]) },
      ),
    );
  const exitCommand =
    /^tailscale set --exit-node=   \(or allow outbound (\d+) on that network\)$/.exec(text);
  if (exitCommand)
    return m(
      msg("tailscale set --exit-node=   (or allow outbound {value0} on that network)", {
        value0: String(exitCommand[1]),
      }),
    );
  const speechModelDescription = /^(.+) speech-to-text\.$/.exec(text);
  if (speechModelDescription)
    return m(msg("{value0} speech-to-text.", { value0: String(speechModelDescription[1]) }));
  const speechPlatform = /^voice transcription is not available on (.+)$/.exec(text);
  if (speechPlatform)
    return m(
      msg("Voice transcription is not available on {value0}", {
        value0: String(speechPlatform[1]),
      }),
    );
  const generatorOff = /^(.+) is off\. Turn it on in Settings → Providers\.$/.exec(text);
  if (generatorOff)
    return m(
      msg("{value0} is off. Turn it on in Settings → Providers.", {
        value0: String(generatorOff[1]),
      }),
    );
  const generatorModels = /^(.+) lists no models to test with\.$/.exec(text);
  if (generatorModels)
    return m(msg("{value0} lists no models to test with.", { value0: String(generatorModels[1]) }));
  const generatorReach = /^Couldn't reach (.+)\. Check the base URL and your connection\.$/.exec(
    text,
  );
  if (generatorReach)
    return m(
      msg("Could not reach {value0}. Check the base URL and your connection.", {
        value0: String(generatorReach[1]),
      }),
    );
  const generatorReply = /^(.+) returned a reply Liverary couldn't read\.$/.exec(text);
  if (generatorReply)
    return m(
      msg("{value0} returned a reply Liverary could not read.", {
        value0: String(generatorReply[1]),
      }),
    );
  const generatorTimeout = /^(.+) took too long to respond\.$/.exec(text);
  if (generatorTimeout)
    return m(msg("{value0} took too long to respond.", { value0: String(generatorTimeout[1]) }));
  const generatorLimit = /^(.+) reached its output limit\.$/.exec(text);
  if (generatorLimit)
    return m(msg("{value0} reached its output limit.", { value0: String(generatorLimit[1]) }));
  const generatorEmpty = /^(.+) returned no text\.$/.exec(text);
  if (generatorEmpty)
    return m(msg("{value0} returned no text.", { value0: String(generatorEmpty[1]) }));
  const generatorStatus =
    /^(.+) (rejected the API key|couldn't find that model or endpoint|is rate-limiting requests|returned HTTP (\d+))(?:\.|: ([\s\S]*))$/.exec(
      text,
    );
  if (generatorStatus) {
    const reason =
      generatorStatus[2] === "rejected the API key"
        ? m(msg("Rejected the API key"))
        : generatorStatus[2] === "couldn't find that model or endpoint"
          ? m(msg("Could not find that model or endpoint"))
          : generatorStatus[2] === "is rate-limiting requests"
            ? m(msg("Rate-limiting requests"))
            : m(msg("Returned HTTP {value0}", { value0: String(generatorStatus[3]) }));
    return m(
      msg("{value0}: {reason}{value2}", {
        value0: String(generatorStatus[1]),
        reason: String(reason),
        value2: String(generatorStatus[4] ? `: ${generatorStatus[4]}` : "."),
      }),
    );
  }
  return text;
}

export function localizeProjectRemovalConfirmation(message: string): string {
  return message
    .split("\n")
    .map((line) => {
      const question =
        /^Remove (checkout|project) "(.+)"(?: and delete its (\d+) threads?)?\?$/.exec(line);
      if (question)
        return m(
          msg("Remove {value1} “{value0}”{value2}?", {
            value0: String(question[2]),
            value1: String(question[1] === "checkout" ? m(msg("Checkout")) : m(msg("Project"))),
            value2: String(
              question[3] ? m(msg(" and {value0} threads", { value0: String(question[3]) })) : "",
            ),
          }),
        );
      if (line.startsWith("Path: "))
        return m(msg("Path: {value0}", { value0: String(line.slice(6)) }));
      if (line.startsWith("Environment: "))
        return m(msg("Environment: {value0}", { value0: String(line.slice(13)) }));
      const grouped = /^This removes (\d+) grouped project entries\.$/.exec(line);
      if (grouped)
        return m(
          msg("This removes {value0} grouped project entries.", { value0: String(grouped[1]) }),
        );
      const fixed: Record<string, string> = {
        "Those threads and any archived threads are deleted from this app. Provider sessions are kept.":
          m(
            msg(
              "Those threads and any archived threads are deleted from this app. Provider sessions are kept.",
            ),
          ),
        "Any archived threads are deleted from this app. Provider sessions are kept.": m(
          msg("Any archived threads are deleted from this app. Provider sessions are kept."),
        ),
        "This removes only the project entries, not the files on disk.": m(
          msg("This removes only the project entries, not the files on disk."),
        ),
        "Other entries in this grouped project are unaffected.": m(
          msg("Other entries in this grouped project are unaffected."),
        ),
        "This action cannot be undone.": m(msg("This action cannot be undone.")),
      };
      return fixed[line] ?? line;
    })
    .join("\n");
}

export function localizeSourceControlGuidance(text: string): string {
  const translated = localizeSettingsText(text);
  if (translated !== text) return translated;
  const environmentToken =
    /^Using (.+) from the server environment; it overrides the account chosen in Settings\.$/.exec(
      text,
    );
  if (environmentToken)
    return m(
      msg(
        "Using {value0} from the server environment; it overrides the account chosen in Settings.",
        { value0: String(environmentToken[1]) },
      ),
    );
  const gitCafeAuth = /^GitCafe authentication status could not be read\. Run `(.+)`\.$/.exec(text);
  if (gitCafeAuth)
    return m(
      msg("GitCafe authentication status could not be read. Run `{value0}`.", {
        value0: String(gitCafeAuth[1]),
      }),
    );
  const gitCafeInstall =
    /^Install the GitCafe CLI with `(.+)`, then run `(.+)`, save a token in Settings, or set CAFE_TOKEN on the server\.$/.exec(
      text,
    );
  if (gitCafeInstall)
    return m(
      msg(
        "Install the GitCafe CLI with `{value0}`, then run `{value1}`, save a token in Settings, or set CAFE_TOKEN on the server.",
        { value0: String(gitCafeInstall[1]), value1: String(gitCafeInstall[2]) },
      ),
    );
  const architecture =
    /^`(.+)` is built for another CPU architecture, so this (.+) machine cannot run it\. Remove or replace it\. (.+)$/.exec(
      text,
    );
  if (architecture)
    return m(
      msg(
        "`{value0}` is built for another CPU architecture, so this {value1} machine cannot run it. Remove or replace it. {value2}",
        {
          value0: String(architecture[1]),
          value1: String(architecture[2]),
          value2: String(localizeSettingsText(architecture[3]!)),
        },
      ),
    );
  return text;
}

const storageCleanupReasons: Readonly<Record<string, string>> = {
  "no thread uses this worktree": m(msg("no thread uses this worktree")),
  "no thread uses this folder, and it isn't a git worktree": m(
    msg("no thread uses this folder, and it isn't a git worktree"),
  ),
  "no rules apply": m(msg("no rules apply")),
  "project is unavailable": m(msg("project is unavailable")),
  "thread is running or has pending work": m(msg("thread is running or has pending work")),
  "a subagent thread's branch differs from this worktree's branch": m(
    msg("a subagent thread's branch differs from this worktree's branch"),
  ),
  "open terminal": m(msg("open terminal")),
  "worktree is a symbolic link": m(msg("worktree is a symbolic link")),
  "outside the managed worktree folder": m(msg("outside the managed worktree folder")),
  "contains a project checkout": m(msg("contains a project checkout")),
  "not a linked worktree": m(msg("not a linked worktree")),
  "repository or branch changed": m(msg("repository or branch changed")),
  "settled moments ago": m(msg("settled moments ago")),
  "thread was deleted": m(msg("thread was deleted")),
  "no remote is configured for merged-worktree cleanup": m(
    msg("no remote is configured for merged-worktree cleanup"),
  ),
  "project branch is unavailable": m(msg("project branch is unavailable")),
  "default branch is unavailable": m(msg("default branch is unavailable")),
  "no commits beyond the project branch": m(msg("no commits beyond the project branch")),
  "no commits beyond the default branch": m(msg("no commits beyond the default branch")),
  "pull request was merged": m(msg("pull request was merged")),
  "has commits beyond the project branch": m(msg("has commits beyond the project branch")),
  "has commits beyond the default branch": m(msg("has commits beyond the default branch")),
  "not settled": m(msg("not settled")),
  "not merged": m(msg("not merged")),
  "thread or cleanup settings changed since check": m(
    msg("thread or cleanup settings changed since check"),
  ),
  "thread deletion is still pending": m(msg("thread deletion is still pending")),
  "thread activity or shared worktree changed since check": m(
    msg("thread activity or shared worktree changed since check"),
  ),
  "parent settlement changed since check": m(msg("parent settlement changed since check")),
  "provider session is still open": m(msg("provider session is still open")),
  "repository or branch changed since check": m(msg("repository or branch changed since check")),
  "commit changed since check": m(msg("commit changed since check")),
  "settings changed since check": m(msg("settings changed since check")),
  "local changes exceed the inspection limit": m(msg("local changes exceed the inspection limit")),
  "ignored files exceed the inspection limit": m(msg("ignored files exceed the inspection limit")),
  "submodule inspection exceeded the limit": m(msg("submodule inspection exceeded the limit")),
  "submodule repository could not be inspected": m(
    msg("submodule repository could not be inspected"),
  ),
  "submodule has commits not on a remote-tracking ref": m(
    msg("submodule has commits not on a remote-tracking ref"),
  ),
  "submodules could not be inspected": m(msg("submodules could not be inspected")),
  "submodule has local files": m(msg("submodule has local files")),
  "no expired files": m(msg("no expired files")),
};

export function localizeStorageCleanupReason(reason: string): string {
  const normalized = reason.replace(/^./, (character) => character.toLowerCase());
  const fixed = storageCleanupReasons[normalized];
  if (fixed) return fixed;
  const shared = /^shared by (\d+) threads$/.exec(normalized);
  if (shared) return m(msg("Shared by {value0} threads", { value0: String(shared[1]) }));
  const age = /^(inactive|settled) for (\d+)(?: of (\d+))? days$/.exec(normalized);
  if (age) {
    const elapsed = age[3]
      ? m(msg("{value1} of {value0} days", { value0: String(age[3]), value1: String(age[2]) }))
      : m(msg("{value0} days", { value0: String(age[2]) }));
    return age[1] === "inactive"
      ? m(msg("Inactive for {elapsed}", { elapsed: String(elapsed) }))
      : m(msg("Settled for {elapsed}", { elapsed: String(elapsed) }));
  }
  const changes = /^(submodule )?has uncommitted changes \((\d+) files?\)$/.exec(normalized);
  if (changes)
    return m(
      msg("{value0}has uncommitted changes ({value1} files)", {
        value0: String(changes[1] ? m(msg("Submodule ")) : ""),
        value1: String(changes[2]),
      }),
    );
  const ignored = /^(submodule )?has ignored files \((.+)\)$/.exec(normalized);
  if (ignored)
    return m(
      msg("{value0}has ignored files ({value1})", {
        value0: String(ignored[1] ? m(msg("Submodule ")) : ""),
        value1: String(ignored[2]),
      }),
    );
  const removed = /^removed (\d+) (browser artifacts|rotated logs)$/.exec(normalized);
  if (removed)
    return m(
      msg("Removed {value1} {value0}", {
        value0: String(
          removed[2] === "browser artifacts" ? m(msg("Browser artifacts")) : m(msg("Rotated logs")),
        ),
        value1: String(removed[1]),
      }),
    );
  return reason;
}
export const cloudSpeechDisclosure = (provider: CloudSpeechProvider, environment: string) =>
  provider === "openrouter"
    ? m(
        msg(
          "When you stop recording, {environment} sends the recording to OpenRouter. OpenRouter chooses the provider that runs the model. Liverary requests no data retention, but your OpenRouter account may allow retention for safety.",
          { environment: String(environment) },
        ),
      )
    : m(
        msg(
          "When you stop recording, {environment} sends the recording and vocabulary hints, including project names, to {value1}.",
          {
            environment: String(environment),
            value1: String(CLOUD_SPEECH_PROVIDER_NAMES[provider]),
          },
        ),
      );
export const scheduledTaskStatus = (status: ScheduledTask["lastRunStatus"]) =>
  ({
    never: m(msg("Never requested")),
    running: m(msg("Sending")),
    succeeded: m(msg("Request delivered")),
    failed: m(msg("Send failed")),
  })[status];
export const resourceSourceStatus = (status: string) =>
  ({
    starting: m(msg("Starting")),
    healthy: m(msg("Healthy")),
    degraded: m(msg("Degraded")),
    unavailable: m(msg("not available")),
    stopped: m(msg("Stopped")),
  })[status as "starting" | "healthy" | "degraded" | "unavailable" | "stopped"] ?? status;
export const thermalState = (state: string) =>
  ({
    unknown: m(msg("Unknown")),
    nominal: m(msg("Healthy")),
    fair: m(msg("Normal", { $context: "settingsCopy.ts" })),
    serious: m(msg("Serious")),
    critical: m(msg("Critical")),
  })[state as "unknown" | "nominal" | "fair" | "serious" | "critical"] ?? state;
export const backendToggleFailed = (enabled: boolean) =>
  enabled ? m(msg("Could not enable the backend")) : m(msg("Could not disable the backend"));
export const unarchive = (title: string) => m(msg("Unarchive {title}", { title: String(title) }));
export const remove = (label: string) => m(msg("Remove {label}", { label: String(label) }));
