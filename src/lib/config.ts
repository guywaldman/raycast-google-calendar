import { LocalStorage } from "@raycast/api";

export interface ExtensionCalendarConfigurationItem {
  hidden: boolean;
}

export interface ExtensionConfig {
  calendarConfiguration: Record<string, ExtensionCalendarConfigurationItem>;
}

export const DefaultConfig: ExtensionConfig = {
  calendarConfiguration: {},
};

export async function getConfig(): Promise<ExtensionConfig> {
  try {
    console.log("Getting config from storage...");
    const configFromStorage = await LocalStorage.getItem<string>("config");
    console.log("Got config from storage", configFromStorage);
    if (configFromStorage) {
      const configFromStorageValue = configFromStorage.valueOf();
      if (typeof configFromStorageValue === "string") {
        return JSON.parse(configFromStorageValue) as ExtensionConfig;
      } else {
        throw new Error("Config is not a string");
      }
    } else {
      return DefaultConfig;
    }
  } catch (err) {
    console.log("asdasdas");
    console.error(err);
    return DefaultConfig;
  }
}

export async function setConfig(config: ExtensionConfig) {
  await LocalStorage.setItem("config", JSON.stringify(config));
}
