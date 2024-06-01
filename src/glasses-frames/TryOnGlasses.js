import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as faceMeshLib from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import frame1 from "./frame1.png";
import frame2 from "./frame2.png";
import frame3 from "./frame1.png";
import frame4 from "./frame2.png";
import frame5 from "./frame1.png";
import frame6 from "./frame1.png";
import loadingSpinner from "./loading-spinner.gif";

const TryOnFrames = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null); // Reference for face mesh instance
  const frameRefs = [
    { image: useRef(new Image()) },
    { image: useRef(new Image()) },
    { image: useRef(new Image()) },
    { image: useRef(new Image()) },
    { image: useRef(new Image()) },
    { image: useRef(new Image()) },
  ];
  const [selectedFrame, setSelectedFrame] = useState(
    () => parseInt(localStorage.getItem("selectedFrame")) || 0
  );
  const [loading, setLoading] = useState(true);
  const frameImages = [
    { image: frame1 },
    { image: frame2 },
    { image: frame3 },
    { image: frame4 },
    { image: frame5 },
    { image: frame6 },
  ];
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const loadFrameImages = async () => {
      await Promise.all(
        frameRefs.map((frame, index) => {
          frame.image.current.src = frameImages[index].image;
          return new Promise(
            (resolve) => (frame.image.current.onload = resolve)
          );
        })
      );

      setLoading(true); // Set loading to false after all frame images are loaded
      startFaceMesh();
    };

    loadFrameImages();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedFrame", selectedFrame);
  }, [selectedFrame]);

  useEffect(() => {
    const storedFrame = localStorage.getItem("selectedFrame");
    setSelectedFrame(parseInt(storedFrame) || 0);
  }, []);

  const startFaceMesh = () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      console.error("Webcam or its video property is null");
      return;
    }

    const faceMesh = new faceMeshLib.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh; // Store face mesh instance in ref

    const camera = new cam.Camera(webcamRef.current.video, {
      onFrame: async () => {
        await faceMesh.send({ image: webcamRef.current.video });
      },
      width: 1920,
      height: 1080,
    });
    camera.start();
  };

  const onResults = (results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    if (results.multiFaceLandmarks) {
      const landmarks = results.multiFaceLandmarks[0];
      drawFrame(canvasCtx, landmarks);
    }
  };

 const drawFrame = (canvasCtx, landmarks) => {
  if (!landmarks || landmarks.length === 0 || selectedFrame === null) {
    console.error("No landmarks available or selected frame is null.");
    return;
  }

  const middleBetweenEyes = landmarks[168];
  const leftEye = landmarks[143];
  const rightEye = landmarks[372];

  // Calculate face angle
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  let faceAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Normalize face angle to be between -90 and 90 degrees
  if (faceAngle < -90 || faceAngle > 90) {
    faceAngle = (faceAngle + 180) % 180 - 90;
  }

  const frameImage = frameRefs[selectedFrame].image.current;

  const eyeDistance =
    Math.abs(rightEye.x - leftEye.x) * canvasRef.current.width;
  const frameWidth = eyeDistance * 1.05; 

  const frameHeight =
    frameWidth / (frameImage.naturalWidth / frameImage.naturalHeight);

  const frameCenterX = middleBetweenEyes.x * canvasRef.current.width;
  let frameCenterY = middleBetweenEyes.y * canvasRef.current.height;

  frameCenterY += 12; 
  
  // Adjust speed and amplitude of movement
  const moveAmount = Math.sin(animationFrame / 100) * 0.2; // Adjust speed and reduce amplitude

  frameCenterY += moveAmount;

  // Draw the frame
  canvasCtx.save(); 
  canvasCtx.translate(frameCenterX, frameCenterY); 
  canvasCtx.rotate(faceAngle * Math.PI / 180); 
  canvasCtx.drawImage(
    frameImage,
    -frameWidth / 2, 
    -frameHeight / 2, 
    frameWidth,
    frameHeight
  );
  canvasCtx.restore(); 
  setAnimationFrame((prevFrame) => prevFrame + 1);
};

  
  

  const handleFrameSelection = (index) => {
    window.location.reload();
    setSelectedFrame(index);
  };

  return (
    <div className="webcam-feed-container">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          className="webcam-feed"
          videoConstraints={{
            width: 1920, 
            height: 1080, 
          }}
        />
        <canvas
          ref={canvasRef}
          className="overlay-canvas"
          width={1920} 
          height={1080} 
        />
        {loading && (
          <div className="loading-overlay">
            <img src={loadingSpinner} alt="Loading Spinner" />
          </div>
        )}
      </div>
      <div className="frames-selection-container">
        {frameImages.map((imageSet, index) => (
          <div
            key={index}
            className={`frame-image-wrapper ${
              selectedFrame === index ? "selected" : ""
            }`}
            onClick={() => handleFrameSelection(index)}
          >
            <img
              src={imageSet.image}
              alt={`Frame ${index + 1}`}
              className="frame-image img-fluid"
            />
            {selectedFrame === index && <div className="shadow-box"></div>}
          </div>
        ))}
      </div>
      <style>{`
    .webcam-feed-container {
      width: 100%;
      padding: 8px;
      display: flex;
      justify-content: center; /* Center horizontally */
      align-items: center; /* Center vertically */
      position: relative;
    }

    .webcam-container {
      position: relative;
      width: 72%;
      height: 88vh; 
      margin-right: auto;
      margin-left: auto; /* Center the container */
      overflow: hidden;
    }

    .webcam-feed {
      display: none;
    }

    .overlay-canvas {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      transform: scaleX(-1)
    }

    .loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }

    .loading-overlay img {
      width: 50px;
      height: 50px;
    }

    .frames-selection-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 100;
      padding: 10px;
      position: absolute;
      top: 12%;
      right: 5%;
      background-color: rgba(255, 255, 255, 0.2);
      height: 400px;
      overflow-x: scroll;
    }

    .frame-image-wrapper {
      position: relative;
      margin: 10px;
      cursor: pointer;
    }

    .frame-image {
      max-width: 80px;
      height: auto;
      margin:  10px auto;
    }

    .frames-selection-container::-webkit-scrollbar {
      display: none;
    }

    .shadow-box {
      align-item: center;
      position: absolute;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(157, 157, 157, 0.4);
      border-radius: 5px;
      display: none;
    }

    .frame-image-wrapper.selected .shadow-box {
      display: block;
    }

    .frame-image-wrapper:hover .frame-image {
      transform: scale(1.1);
    }
  `}</style>

    </div>
  );
  
};

export default TryOnFrames;
