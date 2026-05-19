import CodingQuestion from "@/components/CodingQuestion";

export const metadata = {
  title: "Python Coding Challenge | DevTrace",
  description: "Test your Python skills in our secure, Docker-powered environment.",
};

export default function PythonChallengePage() {
  const initialCode = `def reverse_string(s):
    # Write your code here to reverse the string 's'
    pass

# Test cases
print(reverse_string("hello")) # Should print "olleh"
print(reverse_string("DevTrace")) # Should print "ecarTveD"
`;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto h-[85vh]">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            DevTrace Interactive Coding
          </h1>
          <p className="text-gray-400 mt-2">
            Write code in the browser and execute it securely in a Podman/Docker container.
          </p>
        </header>

        <CodingQuestion
          title="String Reversal Challenge"
          description="Write a Python function that takes a string as input and returns the string reversed. Do not use any built-in `reverse` methods."
          initialCode={initialCode}
        />
      </div>
    </div>
  );
}
