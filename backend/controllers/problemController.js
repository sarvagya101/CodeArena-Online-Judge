const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

const SUPPORTED_LANGUAGES = ['cpp', 'python', 'java'];
const TEMP_ROOT = path.join(__dirname, '..', 'temp');

// Common Docker safety flags applied to every sandboxed execution:
// no network access, capped memory/CPU, no new privileges, capped process count.
const DOCKER_SAFETY_FLAGS = '--network none --memory=128m --cpus=0.5 --pids-limit=64 --security-opt=no-new-privileges';

if (!fs.existsSync(TEMP_ROOT)) fs.mkdirSync(TEMP_ROOT, { recursive: true });

// ── Get all problems ─────────────────────────────────────────────────────────
// BUG FIX: "solved" used to be derived from leftover files in /temp, which is
// (a) shared across every visitor — anyone's solve marks it solved for everyone,
// (b) wiped whenever the server restarts or redeploys, and (c) never cleaned up.
// It's now derived from actual Submission records, which is what "solved"
// should mean in the first place.
exports.getAllProblems = async (req, res) => {
    try {
        const problems = await Problem.find().sort({ createdAt: 1 });

        const solvedIds = new Set(
            (await Submission.distinct('problemId', { result: 'Success' })).map(String)
        );

        const problemsWithStatus = problems.map((problem) => ({
            ...problem.toObject(),
            solved: solvedIds.has(String(problem._id)),
        }));

        return res.status(200).json({
            success: true,
            message: 'Problems fetched successfully',
            problems: problemsWithStatus,
        });
    } catch (error) {
        console.error('Error fetching problems:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch problems',
        });
    }
};

// ── Get problem details by ID ────────────────────────────────────────────────
exports.getProblemById = async (req, res) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Problem fetched successfully',
            problem,
        });
    } catch (error) {
        console.error('Error fetching problem by ID:', error);
        return res.status(400).json({ success: false, message: 'Invalid problem ID' });
    }
};

// ── Get submissions by problem ID ────────────────────────────────────────────
exports.getSubmissionsByProblemId = async (req, res) => {
    try {
        const submissions = await Submission.find({ problemId: req.params.id }).sort({ submittedAt: -1 });
        return res.status(200).json({
            success: true,
            message: 'Submissions fetched successfully',
            submissions,
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return res.status(400).json({ success: false, message: 'Invalid problem ID' });
    }
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function validateSubmission(code, language) {
    if (typeof code !== 'string' || !code.trim()) {
        return 'Code cannot be empty';
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        return `Unsupported language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`;
    }
    if (!isCodeSafe(code)) {
        return 'Code contains restricted operations';
    }
    return null;
}

// BUG FIX: filenames used to be derived only from problemId (e.g.
// solution_<problemId>.cpp). Two people submitting to the same problem at the
// same time would overwrite each other's source/binary/input files mid-run.
// Every execution now gets its own scratch directory that is deleted
// afterwards, so concurrent requests never collide and nothing accumulates on
// disk (the original /temp folder never cleaned up compiled binaries either).
function createScratchDir() {
    const dir = path.join(TEMP_ROOT, crypto.randomUUID());
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cleanupScratchDir(dir) {
    fs.rm(dir, { recursive: true, force: true }, () => {});
}

function writeSourceFile(dir, language, code) {
    if (language === 'python') {
        const fileName = 'solution.py';
        fs.writeFileSync(path.join(dir, fileName), code);
        return fileName;
    }
    if (language === 'java') {
        const fileName = 'Solution.java';
        // Force a consistent public class name regardless of what the user typed,
        // since the file must be named after the public class for javac to accept it.
        const fixedCode = code.replace(/public\s+class\s+\w+/, 'public class Solution');
        fs.writeFileSync(path.join(dir, fileName), fixedCode);
        return fileName;
    }
    const fileName = 'solution.cpp';
    fs.writeFileSync(path.join(dir, fileName), code);
    return fileName;
}

function compile(dir, language, fileName) {
    let cmd;
    if (language === 'cpp') {
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" gcc:latest sh -c "g++ /code/${fileName} -o /code/output 2>&1"`;
    } else if (language === 'java') {
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" eclipse-temurin:21 sh -c "javac /code/${fileName} 2>&1"`;
    } else {
        // Python has no separate compile step other than a syntax check.
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" python:3.12-alpine sh -c "python -m py_compile /code/${fileName} 2>&1"`;
    }

    try {
        execSync(cmd, { timeout: 15000, encoding: 'utf-8' });
        return { success: true };
    } catch (error) {
        const errorMsg = (error.stdout || error.stderr || error.message).toString().replace(/\/code\//g, '');
        return { success: false, error: errorMsg };
    }
}

function run(dir, language, fileName, input) {
    const inputFile = 'input.txt';
    fs.writeFileSync(path.join(dir, inputFile), input ?? '');

    let cmd;
    if (language === 'cpp') {
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" gcc:latest sh -c "/code/output < /code/${inputFile}"`;
    } else if (language === 'python') {
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" python:3.12-alpine sh -c "python /code/${fileName} < /code/${inputFile}"`;
    } else {
        cmd = `docker run --rm ${DOCKER_SAFETY_FLAGS} -v "${dir}:/code" eclipse-temurin:21 sh -c "cd /code && java Solution < /code/${inputFile}"`;
    }

    try {
        const result = execSync(cmd, { timeout: 5000, encoding: 'utf-8' }).toString().trim();
        return { result, hasError: false };
    } catch (error) {
        const errorMsg = extractErrorMessage((error.stdout || error.stderr || error.message || '').toString());
        return { result: '', hasError: true, errorMsg };
    }
}

// Helper: whitelist-based restricted-operations check
function isCodeSafe(code) {
    const blacklist = [
        /rm\s+/, /del\s+/, /shutdown/, /reboot/, /format\s+/,
        /system\s*\(/, /os\.system/, /subprocess/, /popen\s*\(/, /shell\s*=\s*True/,
        /import\s+os/, /import\s+sys/, /import\s+subprocess/,
        /from\s+os\s+import/, /from\s+sys\s+import/, /from\s+subprocess\s+import/,
        /__import__\s*\(/,
        /\beval\s*\(/, /\bexec\s*\(/, /compile\s*\(/,
        /while\s*\(\s*true\s*\)/i, /while\s*True\s*:/, /for\s*\(\s*;;\s*\)/,
        /import\s+java\.io\.File/, /import\s+java\.lang\.Runtime/, /import\s+java\.lang\.ProcessBuilder/,
        /Runtime\.getRuntime/,
        /\bsystem\s*\(/, /\bfork\s*\(/, /\bexec[lv]?\s*\(/, /\bpopen\s*\(/,
        /import\s+socket/, /import\s+urllib/, /import\s+requests/, /import\s+java\.net/, /#include\s*<\s*curl/,
        /open\s*\([^)]*['"]\s*w/, /fopen\s*\(/, /FileWriter/, /FileOutputStream/,
    ];
    return !blacklist.some((pattern) => pattern.test(code));
}

function extractErrorMessage(stderr) {
    const lines = stderr.split('\n').map((line) => line.trim()).filter(Boolean);
    const lastRelevant = [...lines].reverse().find(
        (line) => line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')
    );
    return lastRelevant || lines[0] || 'Unknown error';
}

// ── Compile code ──────────────────────────────────────────────────────────────
exports.compileCode = async (req, res) => {
    const { code, language } = req.body;
    const validationError = validateSubmission(code, language);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const dir = createScratchDir();
    try {
        const fileName = writeSourceFile(dir, language, code);
        const compileResult = compile(dir, language, fileName);

        if (!compileResult.success) {
            return res.status(400).json({ success: false, message: 'Compilation failed', error: compileResult.error });
        }
        return res.status(200).json({ success: true, message: 'Compilation successful' });
    } catch (err) {
        console.error('Compile error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during compilation' });
    } finally {
        cleanupScratchDir(dir);
    }
};

// ── Run code with custom input ───────────────────────────────────────────────
exports.runCode = async (req, res) => {
    const { code, language, input } = req.body;
    const validationError = validateSubmission(code, language);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const dir = createScratchDir();
    try {
        const fileName = writeSourceFile(dir, language, code);

        if (language !== 'python') {
            const compileResult = compile(dir, language, fileName);
            if (!compileResult.success) {
                return res.status(400).json({ success: false, message: 'Compilation failed', error: compileResult.error });
            }
        }

        const { result, hasError, errorMsg } = run(dir, language, fileName, input);
        return res.status(200).json({
            success: true,
            output: hasError ? null : result,
            error: hasError ? errorMsg : null,
        });
    } catch (err) {
        console.error('Run error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during run' });
    } finally {
        cleanupScratchDir(dir);
    }
};

// ── Submit solution against all test cases ───────────────────────────────────
exports.submitSolution = async (req, res) => {
    const { code, language } = req.body;
    const problemId = req.params.id;

    const validationError = validateSubmission(code, language);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const problem = await Problem.findById(problemId).catch(() => null);
    if (!problem) {
        return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    if (!problem.testCases?.length) {
        return res.status(400).json({ success: false, message: 'This problem has no test cases configured' });
    }

    const dir = createScratchDir();
    try {
        const fileName = writeSourceFile(dir, language, code);

        if (language !== 'python') {
            const compileResult = compile(dir, language, fileName);
            if (!compileResult.success) {
                return res.status(400).json({ success: false, message: 'Compilation failed', error: compileResult.error });
            }
        }

        const results = problem.testCases.map(({ input, expectedOutput }) => {
            const { result, hasError, errorMsg } = run(dir, language, fileName, input);
            const passed = result === expectedOutput && !hasError;
            return {
                input,
                expectedOutput,
                result: hasError ? 'Runtime error' : result,
                passed,
                ...(hasError && { error: errorMsg }),
            };
        });

        const passedCount = results.filter((r) => r.passed).length;
        const verdict = passedCount === results.length ? 'Success' : 'Failed';

        await Submission.create({
            problemId,
            language,
            code,
            result: verdict,
            passed: passedCount,
            total: results.length,
            testResults: results,
        });

        return res.status(200).json({
            success: true,
            result: verdict,
            passed: passedCount,
            total: results.length,
            testResults: results,
        });
    } catch (err) {
        console.error('Submission error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during submission' });
    } finally {
        cleanupScratchDir(dir);
    }
};
