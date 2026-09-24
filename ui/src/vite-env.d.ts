/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKENBRIEF_TOOL_ID?: string;
  readonly VITE_SHARE_LINK?: string;
  readonly VITE_DEFAULT_LANG?: string;
  readonly VITE_LLM_MAX_TOKENS?: string;
  readonly VITE_LLM_TEMPERATURE?: string;
  readonly VITE_SYNTH_RETRIES?: string;
  readonly VITE_BRIEF_TEXT_TTL_S?: string;
}
