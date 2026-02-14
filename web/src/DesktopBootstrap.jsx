import { useEffect, useMemo, useState } from "react";
import App from "./App.jsx";

const DEFAULT_STATUS = {
  backendStarted: false,
  whatsappConnected: false,
  aiProviderConfigured: false,
  systemReady: false,
  backendError: null,
  whatsappError: null,
  criticalIssues: []
};

function getDesktopApi() {
  if (typeof window === "undefined") return null;
  return window.propaiDesktop || null;
}

function LoadingScreen({ status }) {
  const message = status.backendStarted
    ? "Preparing system services..."
    : "Starting PropAI backend...";

  return (
    <div className="desktop-loading-shell">
      <div className="desktop-loading-card">
        <div className="desktop-spinner" />
        <h1>PropAI Deal OS</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

function ErrorModal({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="desktop-modal-backdrop">
      <div className="desktop-modal-card">
        <h2>System Warning</h2>
        <p>{message}</p>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function DesktopBootstrap() {
  const desktopApi = getDesktopApi();
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [dismissedMessage, setDismissedMessage] = useState("");

  useEffect(() => {
    if (!desktopApi) {
      setStatus({
        ...DEFAULT_STATUS,
        backendStarted: true,
        systemReady: true,
        aiProviderConfigured: true
      });
      return;
    }

    let isActive = true;
    desktopApi
      .getStatus()
      .then((initialStatus) => {
        if (!isActive) return;
        setStatus({ ...DEFAULT_STATUS, ...initialStatus });
      })
      .catch(() => {
        if (!isActive) return;
        setStatus((current) => ({ ...current, backendError: "Unable to read runtime status." }));
      });

    const unsubscribe = desktopApi.onStatus((nextStatus) => {
      if (!isActive) return;
      setStatus({ ...DEFAULT_STATUS, ...nextStatus });
    });

    return () => {
      isActive = false;
      if (unsubscribe) unsubscribe();
    };
  }, [desktopApi]);

  const modalMessage = useMemo(() => {
    const issues = [];
    if (status.backendError) issues.push(status.backendError);
    if (status.whatsappError) issues.push(status.whatsappError);
    if (!status.aiProviderConfigured) {
      issues.push("AI provider is not fully configured. Run onboarding to continue.");
    }
    if (Array.isArray(status.criticalIssues)) {
      for (const issue of status.criticalIssues) {
        if (issue && !issues.includes(issue)) {
          issues.push(issue);
        }
      }
    }
    return issues[0] || "";
  }, [status]);

  useEffect(() => {
    if (modalMessage !== dismissedMessage) return;
    if (!modalMessage) {
      setDismissedMessage("");
    }
  }, [modalMessage, dismissedMessage]);

  const showModal = Boolean(modalMessage) && modalMessage !== dismissedMessage;

  if (!status.systemReady) {
    return (
      <>
        <LoadingScreen status={status} />
        <ErrorModal
          message={showModal ? modalMessage : ""}
          onDismiss={() => setDismissedMessage(modalMessage)}
        />
      </>
    );
  }

  return (
    <>
      <App />
      <ErrorModal
        message={showModal ? modalMessage : ""}
        onDismiss={() => setDismissedMessage(modalMessage)}
      />
    </>
  );
}
