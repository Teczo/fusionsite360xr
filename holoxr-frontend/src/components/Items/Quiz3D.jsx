import { useEffect, useMemo, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, TransformControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Quiz3D — a movable quiz panel with questions, answers, and result screen.
 *
 * Props (mirrors UILabel3D style):
 * - id, name
 * - quiz: {
 *     title: string,
 *     instructions?: string,
 *     settings?: {
 *       feedbackMode?: 'immediate' | 'deferred', // default 'immediate'
 *       shuffle?: boolean,                         // default false
 *       passScore?: number,                        // 0-100 (optional)
 *     },
 *     questions: Array<{
 *       id: string,
 *       type: 'mcq' | 'boolean' | 'text',
 *       prompt: string,
 *       options?: string[],        // for mcq
 *       correct?: number | boolean | string, // index for mcq, bool for boolean, string for text (case-insensitive trim)
 *       explanation?: string,
 *       points?: number            // default 1
 *     }>
 *   }
 * - transform: { x,y,z, rx,ry,rz, sx,sy,sz }
 * - appearance?: {
 *     bg?: string,
 *     fg?: string,         // primary text color
 *     pad?: [number, number],
 *     borderRadius?: number, // reserved for future rounded background
 *     width?: number,        // panel width (world units)
 *     billboard?: boolean
 *   }
 * - selectedModelId, setSelectedModelId
 * - transformMode: 'translate'|'rotate'|'scale'|'none'
 * - orbitRef
 * - isPreviewing: boolean     // when true, hide transform gizmos
 * - updateModelTransform(id, transform)
 */
export default function Quiz3D({
    id,
    name,
    quiz,
    transform,
    appearance = {},
    selectedModelId,
    setSelectedModelId,
    transformMode = "translate",
    orbitRef,
    isPreviewing = false,
    updateModelTransform,
    onStart,                 // () => void
    onAnswer,                // (questionId: string, correct: boolean) => void
    onComplete,              // () => void
}) {
    const groupRef = useRef();
    const isSelected = selectedModelId === id;
    const { camera } = useThree();

    // Appearance
    const {
        bg = "#111827",
        fg = "#ffffff",
        pad = [0.35, 0.25],
        borderRadius = 0.08,
        width = 3.6,
        billboard = false,
    } = appearance || {};

    // Base position (world)
    const panelPos = useMemo(
        () => new THREE.Vector3(transform.x, transform.y, transform.z),
        [transform.x, transform.y, transform.z]
    );

    // Apply rotation/scale
    useEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.rotation.set(transform.rx, transform.ry, transform.rz);
        groupRef.current.scale.set(transform.sx, transform.sy, transform.sz);
    }, [transform.rx, transform.ry, transform.rz, transform.sx, transform.sy, transform.sz]);

    // Optional: billboard toward camera (useful in AR)
    useFrame(() => {
        if (billboard && groupRef.current) {
            groupRef.current.quaternion.copy(camera.quaternion);
        }
    });

    // Select on tap
    const onPointerDown = (e) => {
        e.stopPropagation();
        setSelectedModelId?.(id);
    };

    // Derived layout metrics
    const titleFont = 0.28;
    const bodyFont = 0.2;
    const buttonFont = 0.2;
    const lineGap = 0.18;
    const contentWidth = width - pad[0] * 2;

    // Quiz runtime state
    const [started, setStarted] = useState(false);
    const [order, setOrder] = useState([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // qid -> user answer
    const [score, setScore] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastCorrect, setLastCorrect] = useState(null);
    const [textInput, setTextInput] = useState(""); // ephemeral; AR text entry is via on-screen keyboard

    const settings = quiz?.settings || {};
    const feedbackMode = settings.feedbackMode || "immediate";
    const shuffle = !!settings.shuffle;

    // Build question order at mount/start
    useEffect(() => {
        if (!quiz?.questions?.length) return;
        let idxs = quiz.questions.map((_, i) => i);
        if (shuffle) idxs = shuffleArray(idxs);
        setOrder(idxs);
    }, [quiz, shuffle]);

    // Utilities
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function currentQuestion() {
        if (!order.length) return null;
        return quiz.questions[order[index]];
    }

    function normalize(s) {
        return String(s || "").trim().toLowerCase();
    }

    function gradeQuestion(q, user) {
        if (!q) return { correct: false, pts: 0 };
        const pts = q.points ?? 1;

        if (q.type === "mcq") {
            const correct = Number.isInteger(q.correct) && q.correct === user;
            return { correct, pts: correct ? pts : 0 };
        } else if (q.type === "boolean") {
            const correct = typeof q.correct === "boolean" && q.correct === !!user;
            return { correct, pts: correct ? pts : 0 };
        } else if (q.type === "text") {
            const correct =
                typeof q.correct === "string" &&
                normalize(q.correct) === normalize(user);
            return { correct, pts: correct ? pts : 0 };
        }
        return { correct: false, pts: 0 };
    }

    function totalPossible() {
        return (quiz?.questions || []).reduce((s, q) => s + (q.points ?? 1), 0);
    }

    // Handlers
    const startQuiz = () => {
        setStarted(true);
        setIndex(0);
        setAnswers({});
        setScore(0);
        setShowFeedback(false);
        setLastCorrect(null);
        setTextInput("");
        onStart && onStart();
    };

    const submitAnswer = (userValue) => {
        const q = currentQuestion();
        if (!q) return;

        // Persist user's answer
        setAnswers((prev) => ({
            ...prev,
            [q.id]: userValue,
        }));

        const { correct, pts } = gradeQuestion(q, userValue);
        onAnswer && onAnswer(q.id, !!correct)

        if (feedbackMode === "immediate") {
            setLastCorrect(correct);
            setShowFeedback(true);
            if (correct) setScore((s) => s + pts);
        } else {
            // deferred
            if (correct) setScore((s) => s + pts);
            nextQuestion(); // move on immediately
        }
    };

    const nextQuestion = () => {
        setShowFeedback(false);
        setLastCorrect(null);
        setTextInput("");

        if (index + 1 < order.length) {
            setIndex(index + 1);
        } else {
            // finished
            // (stay on results screen by keeping started=true but with finished flag)
            setStarted(true);
            setIndex(order.length); // sentinel means "results"
            onComplete && onComplete();
        }
    };

    const restart = () => {
        startQuiz();
    };

    // Panel geometry (height grows with content sections)
    // We’ll compute a simple height budget:
    const baseHeader = titleFont + lineGap * 2; // title + spacing
    const instructionsLines = quiz?.instructions ? 1.2 : 0; // simple budget
    const bodyBlock = started
        ? 2.6 // rough: question + options area
        : 1.2; // instructions + start button
    const footerBlock = 0.8; // nav / progress / results
    const panelHeight = baseHeader + instructionsLines + bodyBlock + footerBlock + pad[1] * 2;

    // Rendering helpers
    const Button3D = ({ x, y, w, h = 0.42, label, onClick, disabled = false }) => (
        <group position={[x, y, 0.001]}>
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!disabled) onClick?.();
                }}
            >
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial color={disabled ? "#3b3b3b" : "#2563eb"} />
            </mesh>
            <Text
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                fontSize={buttonFont}
                maxWidth={w - 0.2}
            >
                {label}
            </Text>
        </group>
    );

    const OptionButton3D = ({ x, y, w, label, selected = false, onClick }) => (
        <group position={[x, y, 0.001]}>
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onClick?.();
                }}
            >
                <planeGeometry args={[w, 0.42]} />
                <meshBasicMaterial color={selected ? "#16a34a" : "#374151"} />
            </mesh>
            <Text
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                fontSize={bodyFont}
                maxWidth={w - 0.2}
            >
                {label}
            </Text>
        </group>
    );

    // Panel
    return (
        <>
            <group ref={groupRef} position={panelPos} onPointerDown={onPointerDown} name={name || "Quiz3D"}>
                {/* Background */}
                <mesh position={[0, 0, -0.001]}>
                    <planeGeometry args={[width, panelHeight]} />
                    <meshBasicMaterial color={bg} />
                </mesh>

                {/* Title */}
                <Text
                    position={[0, panelHeight / 2 - pad[1] - titleFont * 0.6, 0.001]}
                    anchorX="center"
                    anchorY="middle"
                    color={fg}
                    fontSize={titleFont}
                    maxWidth={contentWidth}
                >
                    {quiz?.title || "Quiz"}
                </Text>

                {/* Content region origin (top-left) for layout math */}
                <group position={[-contentWidth / 2, panelHeight / 2 - pad[1] * 2 - titleFont - lineGap, 0]}>
                    {!started && (
                        <group>
                            {!!quiz?.instructions && (
                                <Text
                                    position={[contentWidth / 2, 0, 0.001]}
                                    anchorX="center"
                                    anchorY="top"
                                    color={fg}
                                    fontSize={bodyFont}
                                    maxWidth={contentWidth}
                                >
                                    {quiz.instructions}
                                </Text>
                            )}
                            {/* Start button */}
                            <Button3D
                                x={contentWidth / 2}
                                y={-0.9}
                                w={Math.min(1.8, contentWidth)}
                                label="Start Quiz"
                                onClick={startQuiz}
                            />
                        </group>
                    )}

                    {started && index < order.length && (
                        <QuestionBlock
                            x={0}
                            y={0}
                            w={contentWidth}
                            q={currentQuestion()}
                            fg={fg}
                            bodyFont={bodyFont}
                            onSubmit={submitAnswer}
                            showFeedback={showFeedback}
                            lastCorrect={lastCorrect}
                            nextQuestion={nextQuestion}
                            textInput={textInput}
                            setTextInput={setTextInput}
                        />
                    )}

                    {started && index >= order.length && (
                        <ResultsBlock
                            x={0}
                            y={0}
                            w={contentWidth}
                            fg={fg}
                            bodyFont={bodyFont}
                            score={score}
                            total={totalPossible()}
                            onRestart={restart}
                        />
                    )}
                </group>

                {/* Footer: progress */}
                {started && index < order.length && (
                    <Text
                        position={[0, -panelHeight / 2 + pad[1] + 0.24, 0.001]}
                        anchorX="center"
                        anchorY="middle"
                        color={fg}
                        fontSize={bodyFont * 0.9}
                        maxWidth={contentWidth}
                    >
                        {`${index + 1} / ${order.length}`}
                    </Text>
                )}
            </group>

            {/* Editor only: transform gizmo */}
            {isSelected && transformMode !== "none" && !isPreviewing && groupRef.current?.parent && (
                <TransformControls
                    object={groupRef.current}
                    mode={transformMode}
                    onMouseDown={() => {
                        if (orbitRef?.current) orbitRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        if (orbitRef?.current) orbitRef.current.enabled = true;
                        if (!groupRef.current) return;
                        const obj = groupRef.current;
                        updateModelTransform?.(id, {
                            x: obj.position.x,
                            y: obj.position.y,
                            z: obj.position.z,
                            rx: obj.rotation.x,
                            ry: obj.rotation.y,
                            rz: obj.rotation.z,
                            sx: obj.scale.x,
                            sy: obj.scale.y,
                            sz: obj.scale.z,
                        });
                    }}
                />
            )}
        </>
    );
}

// Subcomponents rendered inside the content region
function QuestionBlock({
    x, y, w,
    q, fg, bodyFont,
    onSubmit,
    showFeedback,
    lastCorrect,
    nextQuestion,
    textInput,
    setTextInput
}) {
    if (!q) return null;

    const headerY = y;
    const optionsTop = headerY - 0.7;

    return (
        <group position={[x, 0, 0]}>
            {/* Prompt */}
            <Text
                position={[w / 2, headerY, 0.001]}
                anchorX="center"
                anchorY="top"
                color={fg}
                fontSize={bodyFont}
                maxWidth={w}
            >
                {q.prompt}
            </Text>

            {/* Type-specific inputs */}
            {q.type === "mcq" && (
                <MCQOptions
                    x={w / 2}
                    y={optionsTop}
                    w={Math.min(2.6, w)}
                    options={q.options || []}
                    onSelect={(i) => onSubmit(i)}
                />
            )}

            {q.type === "boolean" && (
                <MCQOptions
                    x={w / 2}
                    y={optionsTop}
                    w={Math.min(2.2, w)}
                    options={["True", "False"]}
                    onSelect={(i) => onSubmit(i === 0)}
                />
            )}

            {q.type === "text" && (
                <TextEntry
                    x={w / 2}
                    y={optionsTop}
                    w={Math.min(2.6, w)}
                    value={textInput}
                    onChange={(v) => setTextInput(v)}
                    onSubmit={() => onSubmit(textInput)}
                />
            )}

            {/* Feedback & next */}
            {showFeedback && (
                <group position={[w / 2, optionsTop - 1.2, 0]}>
                    <Text
                        position={[0, 0, 0.001]}
                        anchorX="center"
                        anchorY="middle"
                        color={lastCorrect ? "#22c55e" : "#ef4444"}
                        fontSize={bodyFont}
                        maxWidth={w}
                    >
                        {lastCorrect ? "Correct!" : "Not quite."}
                    </Text>

                    {/* Explanation (optional) */}
                    {q.explanation && (
                        <Text
                            position={[0, -0.5, 0.001]}
                            anchorX="center"
                            anchorY="top"
                            color={fg}
                            fontSize={bodyFont * 0.9}
                            maxWidth={w}
                        >
                            {q.explanation}
                        </Text>
                    )}

                    <BasicButton
                        x={0}
                        y={-1.1}
                        w={Math.min(1.6, w)}
                        label="Next"
                        onClick={nextQuestion}
                    />
                </group>
            )}
        </group>
    );
}

function ResultsBlock({ x, y, w, fg, bodyFont, score, total, onRestart }) {
    const pct = Math.round((score / Math.max(total, 1)) * 100);

    return (
        <group position={[x, y, 0]}>
            <Text
                position={[w / 2, 0, 0.001]}
                anchorX="center"
                anchorY="top"
                color={fg}
                fontSize={bodyFont}
                maxWidth={w}
            >
                {`You scored ${score}/${total} (${pct}%)`}
            </Text>

            <BasicButton
                x={w / 2}
                y={-0.9}
                w={Math.min(1.8, w)}
                label="Retry"
                onClick={onRestart}
            />
        </group>
    );
}

// Simple button for feedback/next/retry
function BasicButton({ x, y, w, label, onClick }) {
    return (
        <group position={[x, y, 0.001]}>
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onClick?.();
                }}
            >
                <planeGeometry args={[w, 0.42]} />
                <meshBasicMaterial color={"#2563eb"} />
            </mesh>
            <Text
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                fontSize={0.2}
                maxWidth={w - 0.2}
            >
                {label}
            </Text>
        </group>
    );
}

// MCQ Options list
function MCQOptions({ x, y, w, options, onSelect }) {
    const gap = 0.54;
    return (
        <group position={[x, y, 0]}>
            {options.map((opt, i) => (
                <group key={i} position={[0, -i * gap, 0]}>
                    <mesh
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onSelect?.(i);
                        }}
                    >
                        <planeGeometry args={[w, 0.42]} />
                        <meshBasicMaterial color={"#374151"} />
                    </mesh>
                    <Text
                        position={[0, 0, 0.001]}
                        anchorX="center"
                        anchorY="middle"
                        color="#ffffff"
                        fontSize={0.2}
                        maxWidth={w - 0.2}
                    >
                        {opt}
                    </Text>
                </group>
            ))}
        </group>
    );
}

// Text entry mock (tap to submit)
function TextEntry({ x, y, w, value, onChange, onSubmit }) {
    return (
        <group position={[x, y, 0]}>
            {/* Field */}
            <group>
                <mesh>
                    <planeGeometry args={[w, 0.42]} />
                    <meshBasicMaterial color={"#374151"} />
                </mesh>
                <Text
                    position={[0, 0, 0.001]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    fontSize={0.18}
                    maxWidth={w - 0.2}
                >
                    {value?.length ? value : "Tap keyboard to type..."}
                </Text>
            </group>

            {/* Submit */}
            <group position={[0, -0.65, 0]}>
                <mesh
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onSubmit?.();
                    }}
                >
                    <planeGeometry args={[Math.min(1.4, w), 0.38]} />
                    <meshBasicMaterial color={"#2563eb"} />
                </mesh>
                <Text
                    position={[0, 0, 0.001]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    fontSize={0.18}
                    maxWidth={w - 0.2}
                >
                    Submit
                </Text>
            </group>
        </group>
    );
}
