import { useEffect, useRef } from "react";
import "./successAnimation.css";

const SuccessAnimation = ({ message, onDone }) => {
  // Keep a ref so the timer callback always has the latest onDone
  // without re-scheduling the timer every render (critical for mobile
  // where the component may remount after a Firebase redirect)
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDoneRef.current?.();
    }, 3500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fires once on mount

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