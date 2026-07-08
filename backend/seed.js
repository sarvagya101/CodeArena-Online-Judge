const mongoose = require('mongoose');
const Problem = require('./models/Problem');
require('dotenv').config();

if (!process.env.MONGO_URI) {
    console.error('❌ Missing MONGO_URI in environment. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

// BUG FIX: the useNewUrlParser/useUnifiedTopology options passed to
// mongoose.connect() were removed years ago upstream and are silently
// ignored (or rejected outright) by modern MongoDB driver versions.
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected');
        await seedProblems();
        await mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

const problems = [
    // Easy
    {
        title: 'Reverse String',
        difficulty: 'Easy',
        statement: 'Given a string s, reverse the string and return it.',
        examples: ["Input: s = 'hello' Output: 'olleh'"],
        constraints: ['1 <= s.length <= 1000'],
        testCases: [
            { input: 'hello', expectedOutput: 'olleh' },
            { input: 'world', expectedOutput: 'dlrow' },
            { input: 'abcde', expectedOutput: 'edcba' },
        ],
    },
    {
        title: 'Find Maximum in Array',
        difficulty: 'Easy',
        statement: 'Given an array of integers, return the maximum value.',
        examples: ['Input: [1, 3, 5, 2, 4] Output: 5'],
        constraints: ['1 <= arr.length <= 100', '-10^3 <= arr[i] <= 10^3'],
        testCases: [
            { input: '[1,3,5,2,4]', expectedOutput: '5' },
            { input: '[10,20,30,5,6]', expectedOutput: '30' },
            { input: '[-10,-20,-30,-5,-6]', expectedOutput: '-5' },
        ],
    },
    {
        title: 'Sum of Digits',
        difficulty: 'Easy',
        statement: 'Given a positive integer n, return the sum of its digits.',
        examples: ['Input: n = 123 Output: 6'],
        constraints: ['1 <= n <= 10^9'],
        testCases: [
            { input: '123', expectedOutput: '6' },
            { input: '456', expectedOutput: '15' },
            { input: '98765', expectedOutput: '35' },
        ],
    },
    {
        title: 'Palindrome Number',
        difficulty: 'Easy',
        statement: 'Given an integer x, return true if x is a palindrome, otherwise return false.',
        examples: ['Input: x = 121 Output: true'],
        constraints: ['-2^31 <= x <= 2^31 - 1'],
        testCases: [
            { input: '121', expectedOutput: 'true' },
            { input: '-121', expectedOutput: 'false' },
            { input: '10', expectedOutput: 'false' },
        ],
    },
    {
        title: 'FizzBuzz',
        difficulty: 'Easy',
        statement: "Write a program that outputs the string representation of numbers from 1 to n. For multiples of three output 'Fizz' and for multiples of five output 'Buzz'. For numbers which are multiples of both three and five output 'FizzBuzz'.",
        examples: ["Input: n = 15 Output: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']"],
        constraints: ['1 <= n <= 100'],
        testCases: [
            { input: '15', expectedOutput: '[1,2,Fizz,4,Buzz,Fizz,7,8,Fizz,Buzz,11,Fizz,13,14,FizzBuzz]' },
            { input: '10', expectedOutput: '[1,2,Fizz,4,Buzz,Fizz,7,8,Fizz,Buzz]' },
            { input: '5', expectedOutput: '[1,2,Fizz,4,Buzz]' },
        ],
    },
    {
        title: 'Count Vowels',
        difficulty: 'Easy',
        statement: 'Given a string s, return the number of vowels in the string.',
        examples: ["Input: s = 'hello' Output: 2"],
        constraints: ['1 <= s.length <= 1000'],
        testCases: [
            { input: 'hello', expectedOutput: '2' },
            { input: 'programming', expectedOutput: '3' },
            { input: 'abcdefghijklmnopqrstuvwxyz', expectedOutput: '5' },
        ],
    },

    // Medium
    {
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'Medium',
        statement: 'Given a string s, find the length of the longest substring without repeating characters.',
        examples: ["Input: s = 'abcabcbb' Output: 3"],
        constraints: ['0 <= s.length <= 5 * 10^4'],
        testCases: [
            { input: 'abcabcbb', expectedOutput: '3' },
            { input: 'bbbbb', expectedOutput: '1' },
            { input: 'pwwkew', expectedOutput: '3' },
        ],
    },
    {
        title: '3Sum',
        difficulty: 'Medium',
        statement: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
        examples: ['Input: nums = [-1, 0, 1, 2, -1, -4] Output: [[-1, -1, 2], [-1, 0, 1]]'],
        constraints: ['-10^5 <= nums[i] <= 10^5'],
        testCases: [
            { input: '[-1,0,1,2,-1,-4]', expectedOutput: '[[-1,-1,2],[-1,0,1]]' },
            { input: '[0,0,0]', expectedOutput: '[[0,0,0]]' },
            { input: '[1,-1,-1,0]', expectedOutput: '[[-1,-1,1]]' },
        ],
    },
    {
        title: 'Container With Most Water',
        difficulty: 'Medium',
        statement: 'You are given an array height where each element represents the height of a vertical line on a 1D plane. Find two lines that together with the x-axis form a container, such that the container contains the most water.',
        examples: ['Input: height = [1,8,6,2,5,4,8,3,7] Output: 49'],
        constraints: ['1 <= height.length <= 10^4'],
        testCases: [
            { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49' },
            { input: '[1,1]', expectedOutput: '1' },
            { input: '[4,3,2,1,4]', expectedOutput: '16' },
        ],
    },

    // Hard
    {
        title: 'N-Queens',
        difficulty: 'Hard',
        statement: 'The N-queens puzzle is the problem of placing N queens on an N×N chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle.',
        examples: ["Input: n = 4 Output: [[ '.Q..', '...Q', 'Q...', '..Q.' ], [ '..Q.', 'Q...', '...Q', '.Q..' ]]"],
        constraints: ['1 <= n <= 9'],
        testCases: [
            { input: '4', expectedOutput: "[['.Q..','...Q','Q...','..Q.'],['..Q.','Q...','...Q','.Q..']]" },
            { input: '1', expectedOutput: "[['Q']]" },
            // BUG FIX: the original third case had a literal "..." placeholder as its
            // expected output, so it could never pass no matter what the submission
            // produced. n = 2 has no valid arrangement, giving a real, checkable answer.
            { input: '2', expectedOutput: '[]' },
        ],
    },
];

async function seedProblems() {
    await Problem.deleteMany({});
    await Problem.insertMany(problems);
    console.log(`Seeded ${problems.length} problems successfully`);
}
