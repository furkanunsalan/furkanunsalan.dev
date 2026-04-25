import type { Contribution } from "@/types";

export default function ContributionContainer({
  contribution,
}: {
  contribution: Contribution;
}) {
  return (
    <div className="card-interactive group mb-6 p-4 border-l-4 border-l-white/[0.08] hover:border-l-accent-primary">
      <div key={contribution.id}>
        <p className="text-lg font-semibold text-white group-hover:text-accent-primary transition-colors duration-300">
          {contribution.project_name}
        </p>
        <p className="my-1 text-light-secondary/80">
          {contribution.description}
        </p>
        <a
          href={contribution.link}
          target="blank"
          className="text-sm text-light-fourth group-hover:text-accent-primary transition-colors duration-300"
        >
          {contribution.link}
        </a>
        {contribution.tags && contribution.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {contribution.tags.map((tag: string, index: number) => (
              <li key={index}>
                <span className="chip">{tag}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
