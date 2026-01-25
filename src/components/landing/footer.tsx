import { FileText, Github, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-20 mt-20 border-t border-white/10 py-8 sm:mt-32">
      <div className="container mx-auto flex flex-col items-center justify-between gap-y-4 px-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          made with lots of ❤️ by jayant
        </p>
        <div className="flex items-center space-x-6">
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            <Github size={18} />
             <span className="sr-only">GitHub</span>
          </a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/></svg>
             <span className="sr-only">X</span>
          </a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            <Globe size={18} />
             <span className="sr-only">Website</span>
          </a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            <FileText size={18} />
            <span className="sr-only">Documentation</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
