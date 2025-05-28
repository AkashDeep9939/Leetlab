import { db } from "../libs/db.js";
import {
  getLanguageName,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_outputs, problemId } =
      req.body;

    const userId = req.user.id;

    // validate test cases

    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_outputs) ||
      expected_outputs.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid or Missing test cases" });
    }

    // 2. prepare each test case for judge0 batch submission
    const submissions = stdin.map((input) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    // 3. send batch of submission to judge0
    const submitResponse = await submitBatch(submissions);

    const tokens = submitResponse.map((res) => res.token);

    // 4. poll judge0 for results of all submitted test cases
    const results = await pollBatchResults(tokens);

    console.log("Result-----------------");
    console.log(results);

    // Analyze test case result
    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const stdout = result.stdout?.trim();
      const expected_output = expected_outputs[i]?.trim();
      const passed = stdout === expected_output;

      if (!passed) allPassed = false;

      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status.description,
        memory: result.memory ? `${result.memeory}KB` : undefined,
        time: result.time ? `${result.time} s` : undefined,
      };

      // console.log(`Testcase #${i+1}`);
      // console.log(`Input for testcase#${i}: ${stdin[i]}`)
      // console.log(`Expected Output for testcase ${expected_output}`)
      // console.log(`Actual output ${stdout}`)
      // console.log(`Matched : ${passed}`)
    });

    // store submission summary
    const submission = await db.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
        stdrr: detailedResults.some((r) => r.stderr)
          ? JSON.stringify(detailedResults.map((r) => r.stderr))
          : null,
        compileOutput: detailedResults.some((r) => r.compile_output)
          ? JSON.stringify(detailedResults.map((r) => r.compile_output))
          : null,
        status: allPassed ? "Accepted" : "Wrong Answer",
        memory: detailedResults.some((r) => r.memory)
          ? JSON.stringify(detailedResults.map((r) => r.memory))
          : null,
        time: detailedResults.some((r) => r.time)
          ? JSON.stringify(detailedResults.map((r) => r.time))
          : null,
      },
    });

    // if all passed = true marked problem as solved for the current user 
    if(allPassed) {
      await db.problemSolved.upsert({
        where:{
          userId_problemId:{
            userId , problemId
          }
        },
        update:{},
        create:{
          userId , problemId
        }
      })
    }

    // 8. Save individual yest case result
    const testCaseResult = detailedResults.map((result)=>({
      submissionId:submission.id,
      testCaseResult:result.testCase,
      passed:result.passed,
      stdout:result.stdout,
      expected:result.expected,
      stderr:result.stderr,
      compileOutput:result.compile_output,
      status:result.status,
      memeory:result.memeory,
      time:result.time,
    }))

    await db.testCaseResult.createMany({
      data:testCaseResult
    })

    const submissionWithTestCase = await db.submission.fiUnique({
      where:{
        id:submission.id
      },
      include:{
        testCase:true
      }
    })
    res.status(200).json({
      success:true,
      message: "Code Executed! Sucessfully!",
      submission:submissionWithTestCase
    });
  } catch (error) {
    console.error("Error executing code:" , error.message);
    res.status(500).json({error: "Failed to execute code"});
  }
};
