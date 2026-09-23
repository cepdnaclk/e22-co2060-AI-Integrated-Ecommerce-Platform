import { useEffect, useRef } from "react";

/**
 * 3D Glowing Particles expanding from "infinity" (the center depth)
 * outwards towards the screen for an attractive dynamic background.
 */
const ParticleCanvas = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // ── Colors ──
        const COLORS = [
            "#ff6b9d", "#ff4d8d", "#e040fb", "#ab47bc",
            "#f06292", "#ff8a65", "#ff5722", "#ce93d8",
            "#f48fb1", "#ea4c89", "#9c27b0", "#ff7043",
            "#4fc3f7", "#29b6f6", "#00bcd4", "#80deea",
        ];
        const rand = (a, b) => Math.random() * (b - a) + a;
        const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];

        const MAX = 180;
        const MAX_DEPTH = 1000;

        // ── Particle factory ──
        // x and y are randomly distributed in a wide space
        // z represents depth (larger z = further away)
        const make = (spawnAtFarEdge = false) => ({
            x: rand(-canvas.width * 1.5, canvas.width * 1.5),
            y: rand(-canvas.height * 1.5, canvas.height * 1.5),
            z: spawnAtFarEdge ? MAX_DEPTH : rand(10, MAX_DEPTH),
            speed: rand(1.5, 4.5), // speed coming towards camera
            baseRadius: rand(0.8, 2.5),
            color: pick(),
        });

        let particles = Array.from({ length: MAX }, () => make(false));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // adjust focal length based on screen width
            const focalLength = canvas.width * 0.8;

            particles.forEach((p, i) => {
                // Move particle closer to the camera
                p.z -= p.speed;

                // If it passes the camera or spawns too close, respawn at infinity
                if (p.z <= 0) {
                    particles[i] = make(true);
                    return;
                }

                // Project 3D space to 2D screen
                const scale = focalLength / p.z;
                const px = cx + p.x * scale;
                const py = cy + p.y * scale;

                // Respawn if off-screen to improve rendering performance
                if (px < -200 || px > canvas.width + 200 || py < -200 || py > canvas.height + 200) {
                    particles[i] = make(true);
                    return;
                }

                // Particle size increases as it gets closer
                const r = p.baseRadius * scale;

                // Fade out slightly when far away (z > 80% MAX_DEPTH)
                let alpha = 1;
                if (p.z > MAX_DEPTH * 0.8) {
                    alpha = Math.max(0, 1 - (p.z - MAX_DEPTH * 0.8) / (MAX_DEPTH * 0.2));
                }

                ctx.save();

                // Outer glowing halo
                ctx.globalAlpha = alpha * 0.6;
                const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
                grd.addColorStop(0, p.color);
                grd.addColorStop(1, "transparent");
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(px, py, r * 4, 0, Math.PI * 2);
                ctx.fill();

                // Inner bright core
                ctx.globalAlpha = alpha * 0.9;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
            }}
        />
    );
};

export default ParticleCanvas;
