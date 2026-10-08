async function testOllama() {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags");
    const data = await res.json();
    console.log("Connected to Ollama! Available models:", data.models.map(m => m.name));
  } catch (err) {
    console.error("Failed to connect to Ollama:", err.message);
  }
}
testOllama();
