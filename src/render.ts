import { desktopCapturer, Menu } from "@electron/remote"; // need `remote` to access things on main process from render process

const videoElement = document.querySelector("#video");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const videoSelectBtn = document.querySelector("#videoSelectBtn");

videoSelectBtn.addEventListener("click", () => getVideoSources());

// get access to all available screens on user's system to record
async function getVideoSources() {
  console.log(Menu, ":clicked");

  // get access to all available screens on user's system
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => ({
      label: source.name,
      click: () => selectSource(source),
    }))
  );

  videoOptionsMenu.popup();
}

function selectSource(source: Electron.DesktopCapturerSource) {
  //
}
