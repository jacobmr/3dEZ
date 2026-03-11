import SharedDesignView from "@/components/preview/SharedDesignView";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedDesignPage({ params }: SharedPageProps) {
  const { token } = await params;
  return <SharedDesignView token={token} />;
}
