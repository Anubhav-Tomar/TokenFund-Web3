// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TokenFund {
    string public name;
    string public description;
    uint256 public goal;
    uint256 public deadline;
    address public owner;
    bool public paused;

    enum CampaignState { Active, Successful, Failed }
    CampaignState public state;

    struct Group {
        string name;
        uint256 amount;
        uint256 investors;
    }

    struct Investor {
        uint256 totalContribution;
        mapping(uint256 => bool) fundedGroups;
    }

    Group[] public groups;
    mapping(address => Investor) public investors;

    modifier onlyOwner() {
        require(msg.sender == owner, "Non-authorized party");
        _;
    }

    modifier campaignActive() {
        require(state == CampaignState.Active, "Campaign is not active.");
        _;
    }

    modifier notPaused() {
        require(!paused, "Campaign is paused.");
        _;
    }

    constructor(
        address _owner,
        string memory _name,
        string memory _description,
        uint256 _goal,
        uint256 _duration
    ) {
        name = _name;
        description = _description;
        goal = _goal;
        deadline = block.timestamp + (_duration * 1 days);
        owner = _owner;
        state = CampaignState.Active;
    }

    function updateCampaignState() internal {
        if(state == CampaignState.Active) {
            if(block.timestamp >= deadline) {
                state = address(this).balance >= goal ? CampaignState.Successful : CampaignState.Failed;
            } else {
                state = address(this).balance >= goal ? CampaignState.Successful : CampaignState.Active;
            }
        }
    }

    function fund(uint256 _groupIndex) public payable {
        require(_groupIndex < groups.length, "Invalid group.");
        require(msg.value == groups[_groupIndex].amount, "Incorrect amount.");

        groups[_groupIndex].investors++;
        investors[msg.sender].totalContribution += msg.value;
        investors[msg.sender].fundedGroups[_groupIndex] = true;

        updateCampaignState();
    }

    function addGroup(
        string memory _name,
        uint256 _amount
    ) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0.");
        groups.push(Group(_name, _amount, 0));
    }

    function removeGroup(uint256 _index) public onlyOwner {
        require(_index < groups.length, "Group does not exist!");
        groups[_index] = groups[groups.length -1];
        groups.pop();
    }

    function withdraw() public onlyOwner {
        updateCampaignState();
        require(state == CampaignState.Successful, "Campaign is not successful yet.");
        uint256 balance = address(this).balance;
        require(balance > 0, "Insufficient balance for withdrawal.");

        payable(owner).transfer(balance);
    }

    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function refund() public {
        updateCampaignState();
        require(state == CampaignState.Failed, "Refunds not available.");
        uint256 amount = investors[msg.sender].totalContribution;
        require(amount > 0, "No contribution to refund.");

        investors[msg.sender].totalContribution = 0;
        payable(msg.sender).transfer(amount);
    }

    function hasFundedGroup(address _investor, uint256 _groupIndex) public view returns (bool) {
        return investors[_investor].fundedGroups[_groupIndex];
    }

    function getGroups() public view returns (Group[] memory) {
        return groups;
    }

    function togglePause() public onlyOwner {
        paused = !paused;
    }

    function getCampaignStatus() public view returns (CampaignState) {
        if (state == CampaignState.Active && block.timestamp > deadline) {
            return address(this).balance >= goal ? CampaignState.Successful : CampaignState.Failed;
        }
        return state;
    }

    function extendDeadline(uint256 _daysToAdd) public onlyOwner campaignActive {
        deadline += _daysToAdd * 1 days;
    }
}