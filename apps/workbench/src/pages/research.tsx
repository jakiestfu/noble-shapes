import { ArrowUpRight, BookOpen, Code2, Play } from "lucide-react";
import { PROJECT_GITHUB_URL, RESEARCH_LINKS } from "@/lib/resources";

function ResourceLink({ href, title, description }: { href: string; title: string; description: string }) {
  return <a className="resource-link" href={href} target="_blank" rel="noopener noreferrer"><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a>;
}

export function Research() {
  return <main className="content-page"><div className="content-inner research-inner">
    <div className="page-heading"><div><p className="eyebrow">Read & explore</p><h1 className="section-title">Research</h1><p className="page-description">The mathematics and tools behind noble polyhedra.</p></div><span className="page-count">146 + ∞</span></div>

    <section className="research-summary"><p className="eyebrow">The idea</p><h2>One kind of vertex. One kind of face.</h2><p>A noble polyhedron is vertex-transitive and face-transitive: its symmetries can carry any vertex to any other, and any face to any other. Connor Hill’s classification counts 146 finite forms in addition to the two infinite families of stephanoids and disphenoids.</p><a href={RESEARCH_LINKS.paper} target="_blank" rel="noopener noreferrer">Read the classification <ArrowUpRight className="size-4" /></a></section>

    <div className="research-grid">
      <section className="research-section"><div className="research-section-heading"><BookOpen className="size-4" /><h2>Foundations</h2></div><ResourceLink href={RESEARCH_LINKS.paper} title="The complete set of noble polyhedra" description="Connor Hill · paper and classification" /><ResourceLink href={RESEARCH_LINKS.paperPdf} title="Download the paper" description="PDF on arXiv" /><ResourceLink href={RESEARCH_LINKS.nobleWikipedia} title="Noble polyhedron" description="Wikipedia · terminology and examples" /><ResourceLink href={RESEARCH_LINKS.keplerPoinsotWikipedia} title="Kepler–Poinsot polyhedron" description="Wikipedia · the four regular star solids" /></section>

      <section className="research-section"><div className="research-section-heading"><BookOpen className="size-4" /><h2>Explore in Stella</h2></div><ResourceLink href={RESEARCH_LINKS.stellaSmall} title="Small Stella" description="View polyhedra and build paper nets" /><ResourceLink href={RESEARCH_LINKS.stellaGreat} title="Great Stella" description="Explore stellations, facetings, and more" /><ResourceLink href={RESEARCH_LINKS.stella4d} title="Stella4D" description="Explore 4D forms and 3D cross-sections" /></section>
    </div>

    <section className="video-section"><div className="research-section-heading"><Play className="size-4" /><h2>Watch</h2></div><div className="video-layout"><div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/95335U-cUh8" title="Numberphile video about noble polyhedra" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><div className="video-copy"><p className="showcase-kicker">Numberphile</p><h3>Big news in polyhedra</h3><p>Watch the story behind the classification and see the forms in motion.</p><a href={RESEARCH_LINKS.video} target="_blank" rel="noopener noreferrer">Watch on YouTube <ArrowUpRight className="size-4" /></a></div></div></section>

    <section className="project-link"><div className="research-section-heading"><Code2 className="size-4" /><h2>Project source</h2></div><p>The Noble Forms repository link will be added here when it is ready.</p>{PROJECT_GITHUB_URL ? <a href={PROJECT_GITHUB_URL} target="_blank" rel="noopener noreferrer">View on GitHub <ArrowUpRight className="size-4" /></a> : <span className="project-link-pending">GitHub link coming soon</span>}</section>
  </div></main>;
}
