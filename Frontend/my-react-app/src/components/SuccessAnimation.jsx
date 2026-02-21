import { useEffect } from "react";
import "./successAnimation.css";

const SuccessAnimation = ({ message, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone(); // redirect callback
    }, 3500); // Increased from 2200 to 3500 to allow the animation to finish and text to be read

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="success-container">
      <div className="checkmark-circle">
        <div className="checkmark"></div>
      </div>

      <h2 className="success-text">{message}</h2>
      <p className="redirect-text">Redirecting to dashboard...</p>
    </div>
  );
};

export default SuccessAnimation;