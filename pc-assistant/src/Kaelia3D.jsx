// src/Kaelia3D.jsx
import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

export default function Kaelia3D({ listening = false, snapTrigger = 0 }) {
    const group = useRef();
    const [target, setTarget] = useState(new THREE.Vector3(0, 0, 0));
    const speed = 0.6; // movement speed
    const bounds = useMemo(() => ({ x: 2.2, y: 1.2 }), []); // roam area
    const [snapBurst, setSnapBurst] = useState(false);
    const snapClock = useRef(0);

    // pick a new random target within bounds
    const pickTarget = () => {
        setTarget(
            new THREE.Vector3(
                (Math.random() * 2 - 1) * bounds.x,
                (Math.random() * 2 - 1) * bounds.y,
                0
            )
        );
    };

    useEffect(() => {
        pickTarget();
        // pick a new target every 3–6s
        const id = setInterval(pickTarget, 3000 + Math.random() * 3000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // react to "snap" (every time snapTrigger increments)
    useEffect(() => {
        if (!snapTrigger) return;
        snapClock.current = 0;
        setSnapBurst(true);
        const off = setTimeout(() => setSnapBurst(false), 450);
        return () => clearTimeout(off);
    }, [snapTrigger]);

    useFrame((_, dt) => {
        if (!group.current) return;

        // idle wandering: move toward target
        const pos = group.current.position;
        const dir = new THREE.Vector3().subVectors(target, pos);
        const dist = dir.length();
        if (dist > 0.01) {
            dir.normalize();
            pos.addScaledVector(dir, speed * dt);
            // face movement direction
            group.current.rotation.y = THREE.MathUtils.lerp(
                group.current.rotation.y,
                Math.atan2(dir.x, dir.z),
                0.15
            );
        } else {
            pickTarget();
        }

        // subtle idle breathing
        group.current.position.y += Math.sin(performance.now() * 0.002) * 0.0015;

        // quick “snap” squash & stretch pulse
        if (snapBurst) {
            snapClock.current += dt;
            const t = snapClock.current;
            const s = 1 + Math.sin(Math.min(t * 10, Math.PI)) * 0.25;
            group.current.scale.set(s, 1 / s ** 0.5, s); // cartoony pulse
        } else {
            group.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
        }
    });

    // shared materials (toggle emissive when listening)
    const skin = useMemo(() => {
        const m = new THREE.MeshStandardMaterial({
            color: "#f2e7ff",
            metalness: 0.1,
            roughness: 0.4,
            emissive: new THREE.Color("#8a2be2"),
            emissiveIntensity: 0,
        });
        return m;
    }, []);
    const suit = useMemo(() => {
        const m = new THREE.MeshStandardMaterial({
            color: "#3a3f58",
            metalness: 0.4,
            roughness: 0.3,
            emissive: new THREE.Color("#00e5ff"),
            emissiveIntensity: 0,
        });
        return m;
    }, []);

    // update emissive when listening
    useEffect(() => {
        const targetIntensity = listening ? 1.6 : 0.0;
        let raf;
        const animate = () => {
            skin.emissiveIntensity = THREE.MathUtils.lerp(
                skin.emissiveIntensity,
                targetIntensity * 0.5,
                0.2
            );
            suit.emissiveIntensity = THREE.MathUtils.lerp(
                suit.emissiveIntensity,
                targetIntensity,
                0.2
            );
            if (
                Math.abs(skin.emissiveIntensity - targetIntensity * 0.5) > 0.01 ||
                Math.abs(suit.emissiveIntensity - targetIntensity) > 0.01
            ) {
                raf = requestAnimationFrame(animate);
            }
        };
        animate();
        return () => cancelAnimationFrame(raf);
    }, [listening, skin, suit]);

    return (
        <group ref={group} position={[0, 0, 0]}>
            {/* head */}
            <mesh material={skin} position={[0, 0.75, 0]}>
                <sphereGeometry args={[0.18, 32, 32]} />
            </mesh>

            {/* torso */}
            <mesh material={suit} position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.16, 0.22, 0.5, 24]} />
            </mesh>

            {/* arms */}
            <mesh material={skin} position={[-0.26, 0.35, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.42, 16]} />
            </mesh>
            <mesh material={skin} position={[0.26, 0.35, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.42, 16]} />
            </mesh>

            {/* hips/legs */}
            <mesh material={suit} position={[0, 0, 0]}>
                <cylinderGeometry args={[0.18, 0.14, 0.3, 20]} />
            </mesh>
            <mesh material={skin} position={[-0.09, -0.35, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
            </mesh>
            <mesh material={skin} position={[0.09, -0.35, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
            </mesh>

            {/* a subtle necklace-like ring that looks holographic */}
            <mesh material={suit} position={[0, 0.58, 0]}>
                <torusGeometry args={[0.14, 0.01, 16, 64]} />
            </mesh>

            {/* snap sparkle burst */}
            {snapBurst && <Sparkles count={40} scale={1.5} size={4} speed={1.5} />}
        </group>
    );
}
