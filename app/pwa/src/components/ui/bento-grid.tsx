import * as React from "react"

import { cn } from "@/shared/utils"

/**
 * Bento grid layout — a responsive CSS grid with rounded, bordered cells.
 *
 * Usage:
 *   <BentoGrid>
 *     <BentoCell className="col-span-2">Wide card</BentoCell>
 *     <BentoCell>Regular card</BentoCell>
 *   </BentoGrid>
 *
 * Sizing is controlled via standard Tailwind grid utilities on each cell
 * (col-span-*, row-span-*). The grid defaults to 4 columns on desktop
 * and stacks on mobile.
 */

function BentoGrid({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="bento-grid"
            className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
                className
            )}
            {...props}
        />
    )
}

function BentoCell({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="bento-cell"
            className={cn(
                "h-full",
                className
            )}
            {...props}
        />
    )
}

export { BentoGrid, BentoCell }
