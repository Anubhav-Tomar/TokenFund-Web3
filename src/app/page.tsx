'use client';
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { useReadContract } from "thirdweb/react";
import { client } from "./client";
import { Holesky } from "@thirdweb-dev/chains";
import { getContract } from "thirdweb";
import { TOKENFUND_FACTORY } from "./constants/contracts";
import CampaignCard from "./components/CampaignCard";
// import { CampaignCard } from "./components/CampaignCard"; 

export default function Home() {
  // Get TokenfundFactory contract
  const contract = getContract({
    client: client,
    chain: { ...Holesky, id: 17000, rpc: "https://17000.rpc.thirdweb.com/${THIRDWEB_API_KEY}", faucets: [...Holesky.faucets] },
    address: TOKENFUND_FACTORY,
  });

  // Get all campaigns deployed with TokenfundFactory
  const { data: campaigns, isPending: isPendingCampaigns } = useReadContract({
    contract,
    method:
      "function getAllCampaigns() view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
    params: [],
  });

  return (
    <main className="mx-auto max-w-7xl px-4 mt-4 sm:px-6 lg:px-8">
      <div className="py-10">
        <h1 className="text-4xl font-bold mb-4">Campaigns:</h1>
        <div className="grid grid-cols-3 gap-4">
          {!isPendingCampaigns && campaigns && (
            campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.campaignAddress}
                  campaignAddress={campaign.campaignAddress} 
                />
              ))
            ) : (
              <p>No Campaigns Found</p>
            )
          )}
        </div>
      </div>
    </main>
  );
}
