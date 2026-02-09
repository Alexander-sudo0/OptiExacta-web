import Image from 'next/image'

interface Feature {
  title: string
  description: string
  gifUrl: string
  reverse?: boolean
}

export function FeatureWithGif({ feature }: { feature: Feature }) {
  const content = (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-foreground mb-4">{feature.title}</h3>
        <p className="text-lg text-muted-foreground">{feature.description}</p>
      </div>
      <div className="flex-1 relative h-80 rounded-lg overflow-hidden">
        <Image
          src={feature.gifUrl || "/placeholder.svg"}
          alt={feature.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>
    </>
  )

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 ${feature.reverse ? 'lg:flex-row-reverse' : ''}`}>
      {feature.reverse ? (
        <>
          {content}
        </>
      ) : (
        <>
          {content}
        </>
      )}
    </div>
  )
}
