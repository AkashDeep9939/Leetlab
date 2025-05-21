import { decodeBase64 } from "bcryptjs";

export const executeCode = async (req , res)=>{
    try {
        const {source_code , language_id , stdin , expected_outputs , problemId} = req.body

        const userId = req.user.id;

        // validate test cases

        if(
            !Array.isArray(stdin) || 
            stdin.length === 0 ||
            !Array.isArray(expected_outputs) ||
            expected_outputs.length !== stdin.length
        )
        {
            return res.status(400).json({error:"Invalid or Missing test cases"})
        }

        // 2. prepare each test case for judge0 batch submission 
        const submissions = stdin.map((input)=>({
            source_code,
            language_id,
            stdin:input,
        }));

        // 3. send batch of submission to judge0
        const submitResponse = await submitbatch(submissions);

        const tokens = submitResponse.map((res)=>res.token);

        // 4. poll judge0 for results of all submitted test cases
        const results = await pollBatchResult(tokens);

        console.log('Result-----------------')
        console.log(result);

        res.status(200).json({
            message:"Code Executed!"
        })
    } catch(error) {

    }
}