import { chatMessages } from "~/locales/ko/chatMessages";
export type BrowserMicrophone = Pick<MediaDeviceInfo, "deviceId" | "label">;

export async function listBrowserMicrophones(): Promise<BrowserMicrophone[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput")
    .map(({ deviceId, label }, index) => ({
      deviceId,
      label: label || chatMessages.microphoneNumber(index + 1),
    }));
}
