import {db} from "../libs/db.js"
import {
    getJudge0LanguageId,
    pollBatchResults,
    submitBatch,
  } from "../libs/judge0.lib.js";



// create problem controller
export const createProblem = async (req, res) => {
    const {
      title,
      description,
      difficulty,
      tags,
      examples,
      constraints,
      testcases,
      codeSnippets,
      referenceSolution,
    } = req.body;
  
    // going to check the user role once again
  
    try {
      for (const [language, solutionCode] of Object.entries(referenceSolution)) {
        const languageId = getJudge0LanguageId(language);
  
        if (!languageId) {
          return res
            .status(400)
            .json({ error: `Language ${language} is not supported` });
        }
  
        //
        const submissions = testcases.map(({ input, output }) => ({
          source_code: solutionCode,
          language_id: languageId,
          stdin: input,
          expected_output: output,
        }));
  
        const submissionResults = await submitBatch(submissions);
  
        const tokens = submissionResults.map((res) => res.token);
  
        const results = await pollBatchResults(tokens);
  
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          console.log("Result-----", result);
          // console.log(
          //   `Testcase ${i + 1} and Language ${language} ----- result ${JSON.stringify(result.status.description)}`
          // );
          if (result.status.id !== 3) {
            return res.status(400).json({
              error: `Testcase ${i + 1} failed for language ${language}`,
            });
          }
        }
      }
  
      const newProblem = await db.problem.create({
        data: {
          title,
          description,
          difficulty,
          tags,
          examples,
          constraints,
          testcases,
          codeSnippets,
          referenceSolution,
          userId: req.user.id,
        },
      });
  
      return res.status(201).json({
        sucess: true,
        message: "Message Created Successfully",
        problem: newProblem,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error: "Error While Creating Problem",
      });
    }
  };

// get All Problems controllers
export const getAllProblems = async (req , res) => {
    try {
        const problems = await db.problem.findMany();

        if(!problems) {
            return res.status(404).json({
                error:"No problems Found"
            })
        }

        res.status(200).json({
            sucess:true,
            message:"Message Fetched Successfully",
            problems
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Error While Fetching Problems",
        });
    }
}

export const getProblemById = async ( req , res) => {
    const {id} = req.params;

    try {
        const problem = await db.problem.findUnique({
            where: {
              id,
            },
          });

        if(!problem){
            return res.status(404).json ({
                error:"Problem not found."
            })
        }

        return res.status(200).json({
            sucess:true,
            message:"Message Created Successfully",
            problem,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Error While Fetching Problem by id",
        });
    }
};

// todo: Implement by yourself
export const updateProblem = async ( req , res) => {
    // id 
    // id -----> problem (condition)
    //
}

export const deleteProblem = async ( req , res) => {
    const { id } = req.params;

    try {
        const problem = await db.problem.findUnique({ where: { id } });

        if(!problem) {
            return res.status(404).json({error: "Problem Not found"});
        }

        await db.problem.delete({ where: { id } });

        res.status(200).json({
            sucess: true,
            message: "Problem deleted Successfully",
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: "Error while deleting the problem",
        });
    }
};

export const getAllProblemSolvedByUser = async ( req , res) => {

}