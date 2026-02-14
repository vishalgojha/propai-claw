const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("propaiDesktop", {
  isDesktop: true,
  getStatus: () => ipcRenderer.invoke("propai:get-status"),
  openLogs: () => ipcRenderer.invoke("propai:open-logs"),
  onStatus: (handler) => {
    if (typeof handler !== "function") {
      return () => {};
    }
    const wrapped = (_event, payload) => {
      handler(payload);
    };
    ipcRenderer.on("propai:status", wrapped);
    return () => {
      ipcRenderer.removeListener("propai:status", wrapped);
    };
  }
});
