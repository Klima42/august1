/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MOONDREAM_API_KEY: string;
    readonly VITE_SPOONACULAR_API_KEY: string;
    // add any additional custom env variables here
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  