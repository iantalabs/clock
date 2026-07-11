chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return
  const send = () => chrome.tabs.sendMessage(tab.id, { type: 'clock-ext:toggle' })
  try {
    await send()
  } catch (_) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      })
      await send()
    } catch (_) { /* ignore */ }
  }
})
