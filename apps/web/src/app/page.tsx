import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="hero min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold text-primary mb-4">
              Phoenix Framework
            </h1>
            <p className="py-6 text-lg">
              Break through decision paralysis with AI-powered interactive decision sprints. 
              Get unstuck and move forward with confidence.
            </p>
            <Link href="/sprint" className="btn btn-primary btn-lg">
              Start Decision Sprint
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
