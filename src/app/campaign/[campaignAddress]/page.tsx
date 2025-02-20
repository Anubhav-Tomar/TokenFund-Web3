'use client';
import { client } from "@/app/client";
// import { TierCard } from "@/components/TierCard";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getContract, prepareContractCall, ThirdwebContract } from "thirdweb";
import { Holesky } from "@thirdweb-dev/chains";
import { lightTheme, TransactionButton, useActiveAccount, useReadContract } from "thirdweb/react";
import GroupCard from "@/app/components/GroupCard";

export default function CampaignPage() {

    const account = useActiveAccount();
    const { campaignAddress } = useParams(); 
    const [isEditing, setIsEditing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const contract = getContract({
        client: client,
        chain: { ...Holesky, id: 17000, rpc: "https://17000.rpc.thirdweb.com/${THIRDWEB_API_KEY}", faucets: [...Holesky.faucets] },
        address: campaignAddress as string,
    });

    // Name of the campaign
    const { data: name, isPending: isPendingName } = useReadContract({
        contract: contract,
        method: "function name() view returns (string)",
        params: [],
    });

    // Description of the campaign
    const { data: description } = useReadContract({ 
        contract, 
        method: "function description() view returns (string)", 
        params: [] 
      });

    // Campaign deadline
    const { data: deadline, isPending: isPendingDeadline } = useReadContract({
        contract: contract,
        method: "function deadline() view returns (uint256)",
        params: [],
    });

    // Convert deadline to a date
    const deadlineDate = new Date(parseInt(deadline?.toString() as string) * 1000);
    // Check if deadline has passed
    const hasDeadlinePassed = deadlineDate < new Date(); 

     // Goal amount of the campaign
     const { data: goal, isPending: isPendingGoal } = useReadContract({
        contract: contract,
        method: "function goal() view returns (uint256)",
        params: [],
    });
    
    // Total funded balance of the campaign
    const { data: balance, isPending: isPendingBalance } = useReadContract({
        contract: contract,
        method: "function contractBalance() view returns (uint256)",
        params: [],
    });

    // Calulate the total funded balance percentage
    const totalBalance = balance?.toString();
    const totalGoal = goal?.toString();
    let balancePercentage = (parseInt(totalBalance as string) / parseInt(totalGoal as string)) * 100;

    // If balance is greater than or equal to goal, percentage should be 100
    if (balancePercentage >= 100) {
        balancePercentage = 100;
    }

    // Get tiers for the campaign
    const { data: groups, isPending: isPendingGroups } = useReadContract({
        contract,
        method:
          "function getGroups() view returns ((string name, uint256 amount, uint256 investors)[])",
        params: [],
    });

    const { data: owner, isPending: isPendingOwner } = useReadContract({
        contract,
        method: "function owner() view returns (address)",
        params: [],
    });

    const { data: status } = useReadContract({
        contract,
        method:
          "function getCampaignStatus() view returns (uint8)",
        params: [],
    });

    return (
        <div className="mx-auto max-w-7xl px-2 mt-4 sm:px-6 lg:px-8">
           <div className="flex flex-row justify-between items-center">
                {!isPendingName && (
                   <p className="text-4xl font-semibold">{name}</p>
                )}
                {owner === account?.address && ( 
                    <div className="flex flex-row">
                        {isEditing && (
                            <p className="px-4 py-2 bg-gray-500 text-white rounded-md mr-2">
                                Status:  
                                {status === 0 ? " Active" : 
                                status === 1 ? " Successful" :
                                status === 2 ? " Failed" : "Unknown"}
                            </p>
                        )}
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded-md"
                            onClick={() => setIsEditing(!isEditing)}
                        >{isEditing ? "Done" : "Edit"}</button>
                    </div>
                )}
            </div>
            <div className="my-4">
                <p className="text-lg font-semibold">Description:</p>
                <p>{description}</p>
            </div>
            <div className="mb-4">
                <p className="text-lg font-semibold">Deadline</p>
                {!isPendingDeadline && (
                    <p>{deadlineDate.toDateString()}</p>
                )}
            </div>
            {!isPendingBalance &&(
                <div className="mb-4">
                    <div className="relative w-full h-6 bg-gray-200 rounded-full dark:bg-gray-700">
                        <div className="h-6 bg-blue-600 rounded-full dark:bg-blue-500 text-right" style={{ width: `${balancePercentage?.toString()}%`}}>
                            <p className="text-white dark:text-white text-xs p-1">${balance?.toString()} </p>
                        </div>
                       <p className="absolute top-0 right-0 text-white dark:text-white text-xs p-1">
                            {balancePercentage >= 100 ? "" : `${balancePercentage?.toString()}%`}
                        </p>
                    </div>
                </div>    
                )}
                <div>
                    <p className="text-lg font-semibold">Contribution Levels:</p>
                    <div className="grid grid-cols-3 gap-4">
                        {isPendingGroups ? (
                            <p >Loading...</p>
                        ) : (
                            groups && groups.length > 0 ? (
                                groups.map((group, index) => (
                                    <GroupCard 
                                        key={index}
                                        group={group}
                                        index={index}
                                        contract={contract}
                                        isEditing={isEditing}
                                    />
                                ))
                            ) : (
                                !isEditing && (
                                    <p>No Level available</p>    
                                )
                            )
                        )}
                        {isEditing && (
                        // Add a button card with text centered in the middle
                        <button
                            className="max-w-sm flex flex-col text-center justify-center items-center font-semibold p-6 bg-blue-500 text-white border border-slate-100 rounded-lg shadow"
                            onClick={() => setIsModalOpen(true)}
                        >+ Add Level</button>
                    )}
                    </div>
                </div>

                {isModalOpen && (
                <CreateLevelModal
                    setIsModalOpen={setIsModalOpen}
                    contract={contract}
                />
            )}
        </div>
    );
}


type CreateLevelModalProps = {
    setIsModalOpen: (value: boolean) => void
    contract: ThirdwebContract
}

const CreateLevelModal = (
    { setIsModalOpen, contract }: CreateLevelModalProps
) => {
    const [levelName, setlevelName] = useState<string>("");
    const [levelAmount, setlevelAmount] = useState<bigint>(1n);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-md">
            <div className="w-1/2 bg-slate-100 p-6 rounded-md">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-lg font-semibold">Create a Funding Level</p>
                    <button
                        className="text-sm px-4 py-2 bg-slate-600 text-white rounded-md"
                        onClick={() => setIsModalOpen(false)}
                    >Close</button>
                </div>
                <div className="flex flex-col">
                    <label>Level Name:</label>
                    <input 
                        type="text" 
                        value={levelName}
                        onChange={(e) => setlevelName(e.target.value)}
                        placeholder="Level Name"
                        className="mb-4 px-4 py-2 bg-slate-200 rounded-md"
                    />
                    <label>Level Cost:</label>
                    <input 
                        type="number"
                        value={parseInt(levelAmount.toString())}
                        onChange={(e) => setlevelAmount(BigInt(e.target.value))}
                        className="mb-4 px-4 py-2 bg-slate-200 rounded-md"
                    />
                    <TransactionButton
                        transaction={() => prepareContractCall({
                            contract: contract,
                            method: "function addGroup(string _name, uint256 _amount)",
                            params: [levelName, levelAmount]
                        })}
                        onTransactionConfirmed={async () => {
                            alert("Tier added successfully!")
                            setIsModalOpen(false)
                        }}
                        onError={(error) => alert(`Error: ${error.message}`)}
                        theme={lightTheme()}
                    >Add Level</TransactionButton>
                </div>
            </div>
        </div>
    )
}