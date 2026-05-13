"use client"

import type { RefObject } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils/cn"
import type { SearchEntity } from "@/app/api/search/route"

export function entityHref(entity: SearchEntity): string {
  switch (entity.type) {
    case "team":   return `/teams/${entity.id}`
    case "player": return `/players/${entity.id}`
    case "league": return `/leagues/${entity.id}`
    case "coach":  return `/coaches/${entity.id}`
    case "venue":  return `/venues/${entity.id}`
  }
}

function EntityImage({ image, name, type }: { image: string | null; name: string; type: SearchEntity["type"] }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
        className={cn("gs-entity-img", type === "player" || type === "coach" ? "gs-entity-img--round" : "")}
      />
    )
  }
  return (
    <span className={cn("gs-entity-initial", type === "player" || type === "coach" ? "gs-entity-initial--round" : "")}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

interface SearchEntityResultsProps {
  entities: SearchEntity[]
  tilesRef: RefObject<HTMLDivElement | null>
  onSelect: (entity: SearchEntity) => void
}

export function SearchEntityResults({ entities, tilesRef, onSelect }: SearchEntityResultsProps) {
  if (entities.length === 0) return null
  return (
    <div className="gs-entities-section" aria-label="People and teams">
      <div className="gs-entities-scroll" ref={tilesRef}>
        {entities.map((entity) => (
          <Link
            key={`${entity.type}-${entity.id}`}
            href={entityHref(entity)}
            className="gs-entity-tile"
            onClick={() => onSelect(entity)}
          >
            <div className="gs-entity-img-wrap">
              <EntityImage image={entity.image} name={entity.name} type={entity.type} />
              <span className={cn("gs-entity-type-badge", `gs-entity-type-badge--${entity.type}`)} aria-hidden="true">
                {entity.type === "coach" ? "MGR" : entity.type.slice(0, 1).toUpperCase() + entity.type.slice(1)}
              </span>
            </div>
            <span className="gs-entity-name">{entity.name}</span>
            {entity.meta && <span className="gs-entity-meta">{entity.meta}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
