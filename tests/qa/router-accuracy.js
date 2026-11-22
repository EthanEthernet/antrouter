// Router QA: how often the classifier reads a prompt's task the way a person would.
// Run from the repo folder: node tests/qa/router-accuracy.js
// TUNE is the set from the Nov 22 Beta QA pass. HELD_OUT was written before the Nov 22 keyword changes, but its
// misses were seen while choosing keywords, so it is no longer a fair test. FRESH was written after those changes
// and scored once (Nov 22). Don't add keywords to make FRESH pass: write a new fresh set instead.
const path = require('path');
const SRC = path.join(__dirname, '..', '..', 'src');
['models.js', 'router.js'].forEach(f => require(path.join(SRC, f)));
const { router } = globalThis.AntRouter;

const RUST = 'Why does my Rust program deadlock? The service has two worker threads that each take a std::sync::Mutex on the cache and the connection pool, but in opposite order depending on the code path, and under load the whole process hangs with both threads parked and no CPU usage at all. How do I fix it?';
const NOTES = 'Summarize the meeting notes below:\n\nWe agreed to move the launch to March because the vendor contract is still in review. Priya will own the pricing page and Tom will finish the onboarding emails by Friday. Marketing wants a beta list of at least 200 people before we announce anything publicly, and support asked for a two-week freeze on new features before launch.';

const TUNE = [
  ['Fix this off-by-one bug in my Python loop', 'code'], ["What's the capital of Australia?", 'fact'],
  ['Write a short poem about finals week at UCI', 'creative'],
  ['Compare fixed vs floating exchange rates for an emerging market, step by step', 'reason'],
  ['Summarize this 20-page article into key points', 'summarize'],
  ['Design the database schema for a ride-share app, handle edge cases', 'code'], [RUST, 'code'],
  ['I missed class today, what should I study for the midterm?', 'chat'], ['Find the derivative of x^2 sin x', 'reason'],
  ['Give me feedback on my thesis statement: social media harms teen sleep', 'chat'],
  ['Translate "good morning" into Spanish', 'chat'], ['Write a 500-word essay on the causes of World War I', 'creative'],
  ['How do I center a div in CSS?', 'code'], ['What year did the Berlin Wall fall?', 'fact'],
  ['Help me plan a 3-day trip to Tokyo on a budget', 'reason'], ['Write a SQL query to find the top 5 customers by revenue', 'code'],
  ['Explain quantum entanglement simply', 'reason'], ['Draft a polite email to my professor asking for an extension', 'creative'],
  ['tl;dr of the French Revolution', 'summarize'], ['Who wrote Pride and Prejudice?', 'fact'],
  ['Is 1729 a prime number? Prove it', 'reason'], ['thanks!', 'chat'], ['Write unit tests for this function', 'code'],
  ['What are the pros and cons of electric cars?', 'reason'], ['Convert this JSON to YAML', 'code'],
  ['Suggest a name for my bakery', 'creative'], ['How many ounces are in a pound?', 'fact'],
  ['Can you recommend a good sci-fi book?', 'chat'], ['Debug: TypeError undefined is not a function in my React component', 'code'],
  ["Outline the main ideas of Kant's Critique of Pure Reason", 'summarize'],
];
const HELD_OUT = [
  ['My Java program throws a NullPointerException when I call getName(), why?', 'code'],
  ['Write a bash script that renames all .txt files in a folder', 'code'],
  ["What's wrong with this C++ code? It segfaults", 'code'], ['How do I merge two branches in git?', 'code'],
  ['Solve for x: 3x + 5 = 20', 'reason'], ['Should I take out a loan or use savings to buy a car? Weigh the options', 'reason'],
  ['Integrate x times e^x', 'reason'], ['Which is a better investment over 10 years, index funds or bonds?', 'reason'],
  ['Write a cover letter for a barista job', 'creative'], ['Come up with a catchy name for my podcast about cooking', 'creative'],
  ["Write a toast for my sister's wedding", 'creative'], ['Who painted the Mona Lisa?', 'fact'],
  ['When is the next leap year?', 'fact'], ['How tall is Mount Everest?', 'fact'],
  ['Give me a summary of the plot of Hamlet', 'summarize'], [NOTES, 'summarize'],
  ['Can you shorten this paragraph into two sentences?', 'summarize'],
  ["I'm feeling stressed about finals, any tips?", 'chat'], ['good morning!', 'chat'],
  ['What should I cook for dinner tonight?', 'chat'],
];
const FRESH = [
  ['Why is my SQL join returning duplicate rows?', 'code'],
  ['Write a Python function that checks if a string is a palindrome', 'code'],
  ["My website's navbar overlaps the content on mobile, how do I fix it?", 'code'],
  ['Refactor this callback code to use async/await', 'code'],
  ['What is the probability of rolling two sixes?', 'reason'],
  ['Is it worth paying off student loans early or investing instead?', 'reason'],
  ['Calculate the monthly payment on a $20,000 loan at 5% for 5 years', 'reason'],
  ['Write a limerick about a lazy cat', 'creative'], ['Write a LinkedIn post announcing my new job', 'creative'],
  ['Give me three taglines for a coffee shop', 'creative'],
  ['What is the boiling point of water in Fahrenheit?', 'fact'], ['Who was the first person on the moon?', 'fact'],
  ['Where is the Great Barrier Reef?', 'fact'], ['Summarize the key ideas of stoicism', 'summarize'],
  ['Give me a quick overview of the Cold War', 'summarize'], ['What are the main takeaways from Atomic Habits?', 'summarize'],
  ["hey, how's it going?", 'chat'], ['Any advice for my first job interview?', 'chat'],
  ["I can't decide what to watch tonight", 'chat'], ['Recommend a podcast for my commute', 'chat'],
];

function score(name, set, verbose) {
  let ok = 0;
  for (const [p, want] of set) {
    const got = router.classify(p).task; if (got === want) ok++;
    else if (verbose) console.log(`  miss: want ${want}, got ${got} | ${p.replace(/\s+/g, ' ').slice(0, 70)}`);
  }
  console.log(`${name}: ${ok}/${set.length}`);
  return ok;
}
if (require.main === module) {
  const v = process.argv.includes('-v');
  score('Tuning set', TUNE, v); score('Held-out set (seen while tuning)', HELD_OUT, v); score('Fresh set', FRESH, v);
}
module.exports = { TUNE, HELD_OUT, FRESH, score };
