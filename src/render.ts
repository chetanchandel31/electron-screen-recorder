import { desktopCapturer, Menu, dialog } from "@electron/remote"; // need `remote` to access things on main process from render process
import { writeFile } from "fs";

const videoElement: HTMLVideoElement = document.querySelector("#video");
const startBtn: HTMLButtonElement = document.querySelector("#startBtn");
const stopBtn: HTMLButtonElement = document.querySelector("#stopBtn");
const videoSelectBtn: HTMLButtonElement =
  document.querySelector("#videoSelectBtn");

videoSelectBtn.onclick = getVideoSources;

// 1. access all opended screens/windows 2. open a native menu with options corresponding to each screen
async function getVideoSources() {
  // get access to all available screens on user's system(using @electron/remote)
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  // open native menu using @electron/remote, all input sources will be options
  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => ({
      label: source.name,
      click: () => selectSource(source),
    }))
  );

  videoOptionsMenu.popup();
}

let mediaRecorder: MediaRecorder;
let recordedChunks: BlobPart[] = []; // record video in multiple segments(???)

startBtn.onclick = () => {
  if (!mediaRecorder) return alert("please sleect a video source first");
  if (mediaRecorder.state === "recording") return;

  mediaRecorder.start();
  startBtn.classList.add("is-danger");
  startBtn.innerText = "Recording";
};

stopBtn.onclick = () => {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();
  startBtn.classList.remove("is-danger");
  startBtn.innerText = "Start";
};

// change video source window to record (???)
async function selectSource(source: Electron.DesktopCapturerSource) {
  videoSelectBtn.innerText = source.name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const constraints: any = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };

  // create a stream
  // `getUsermedia` - 1. use a media input which produces a MediaStream with tracks containing the requested types of media.
  // 2. That stream can include, for example, a video track (produced by either a hardware or virtual video source such as a camera, video recording device, screen sharing service, and so forth)
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  /** THIS MERELY PREVIEWS THE STREAM IN A VIDEO ELEMENT **/
  // video element has `src` attribute which takes a URL
  // `srcObject` lets us use `MediaStream` directly, w/o having to convert it to URL using `URL.createObjectURL(MediaStream)`
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject
  videoElement.srcObject = stream;
  videoElement.play();

  // so far we have a stream of video from user's system that can be displayed in `video` element
  // now need to record and save it in user's system

  const options: MediaRecorderOptions = { mimeType: "video/webm; codecs=vp9" }; // https://stackoverflow.com/questions/3828352/what-is-a-mime-type
  // A MIME type is a label used to identify a type of data. It serves the same purpose on the Internet that file extensions do on Microsoft Windows.
  // webm is video file format that works with <video /> free of cost https://en.wikipedia.org/wiki/WebM
  mediaRecorder = new MediaRecorder(stream, options);

  // use MediaRecorder's event based api
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e: BlobEvent) {
  recordedChunks.push(e.data);
}

async function handleStop() {
  // blob represents file/binary data (not reference to a file but actual file)
  // it has size and MIME just like that of a simple file
  // https://www.geeksforgeeks.org/javascript-blob/
  const blob = new Blob(recordedChunks, { type: "video/webm; codecs=vp9" });

  const buffer = Buffer.from(await blob.arrayBuffer()); // i think we need to use nodejs based `Buffer` because further processing involves nodejs based APIs

  // open native save dialog using `@electron/remote` and get save location
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "save video",
    defaultPath: `screen-rec-${Date.now()}.webm`,
  });

  // write the file to the save location we just got
  writeFile(filePath, buffer, () => console.log("video saved 🎉")); // TODO: try native notification?

  // reset media recorder's state
  mediaRecorder = undefined;
  recordedChunks = [];

  // reset video element's state
  videoElement.pause();
  videoElement.srcObject = null;
}
