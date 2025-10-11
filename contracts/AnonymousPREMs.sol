// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AnonymousPREMs is SepoliaConfig {
    // Struct to store encrypted survey responses
    struct EncryptedResponse {
        euint32 departmentId;  // Encrypted department identifier
        euint32[] questionScores; // Encrypted scores for each question
        uint256 timestamp;
    }
    
    // Struct for aggregated department statistics
    struct DepartmentStats {
        euint32 totalResponses;   // Encrypted response count
        euint32[] scoreSums;       // Encrypted sum of scores per question
    }
    
    // Contract state variables
    mapping(uint256 => DepartmentStats) private departmentStats;
    uint256[] private activeDepartments;
    
    // Temporary storage for pending submissions
    mapping(uint256 => EncryptedResponse) private pendingSubmissions;
    uint256 private submissionCounter;
    
    // Events
    event ResponseSubmitted(uint256 indexed submissionId);
    event AggregationComplete(uint256 indexed departmentId);
    event StatsRequested(uint256 indexed departmentId);
    event StatsDecrypted(uint256 indexed departmentId);

    /// @notice Submit encrypted patient feedback
    function submitFeedback(
        euint32 encryptedDepartmentId,
        euint32[] calldata encryptedScores
    ) external {
        uint256 newId = ++submissionCounter;
        
        pendingSubmissions[newId] = EncryptedResponse({
            departmentId: encryptedDepartmentId,
            questionScores: encryptedScores,
            timestamp: block.timestamp
        });
        
        emit ResponseSubmitted(newId);
    }

    /// @notice Process pending submissions for aggregation
    function processSubmission(uint256 submissionId) external {
        EncryptedResponse memory submission = pendingSubmissions[submissionId];
        require(FHE.isInitialized(submission.departmentId), "Invalid submission");
        
        // Prepare department ID for decryption
        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(submission.departmentId);
        
        // Request department ID decryption
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.handleDepartmentId.selector);
        pendingSubmissions[reqId] = submission;
        delete pendingSubmissions[submissionId];
    }

    /// @notice Handle decrypted department ID
    function handleDepartmentId(
        uint256 requestId,
        bytes memory cleartext,
        bytes memory proof
    ) external {
        // Verify decryption proof
        FHE.checkSignatures(requestId, cleartext, proof);
        
        // Retrieve original submission
        EncryptedResponse memory submission = pendingSubmissions[requestId];
        uint256 departmentId = abi.decode(cleartext, (uint256));
        
        // Initialize department stats if needed
        if (!FHE.isInitialized(departmentStats[departmentId].totalResponses)) {
            departmentStats[departmentId].totalResponses = FHE.asEuint32(0);
            departmentStats[departmentId].scoreSums = new euint32[](submission.questionScores.length);
            activeDepartments.push(departmentId);
        }
        
        // Update response count
        departmentStats[departmentId].totalResponses = FHE.add(
            departmentStats[departmentId].totalResponses,
            FHE.asEuint32(1)
        );
        
        // Update score sums
        for (uint i = 0; i < submission.questionScores.length; i++) {
            departmentStats[departmentId].scoreSums[i] = FHE.add(
                departmentStats[departmentId].scoreSums[i],
                submission.questionScores[i]
            );
        }
        
        emit AggregationComplete(departmentId);
        delete pendingSubmissions[requestId];
    }

    /// @notice Request statistics decryption for a department
    function requestDepartmentStats(uint256 departmentId) external {
        require(FHE.isInitialized(departmentStats[departmentId].totalResponses), "No data");
        
        // Prepare encrypted data for decryption
        bytes32[] memory ciphertexts = new bytes32[](departmentStats[departmentId].scoreSums.length + 1);
        ciphertexts[0] = FHE.toBytes32(departmentStats[departmentId].totalResponses);
        
        for (uint i = 0; i < departmentStats[departmentId].scoreSums.length; i++) {
            ciphertexts[i+1] = FHE.toBytes32(departmentStats[departmentId].scoreSums[i]);
        }
        
        // Request decryption
        FHE.requestDecryption(ciphertexts, this.handleStatsDecryption.selector);
        emit StatsRequested(departmentId);
    }

    /// @notice Handle decrypted statistics
    function handleStatsDecryption(
        uint256 requestId,
        bytes memory cleartext,
        bytes memory proof
    ) external {
        // Verify decryption proof
        FHE.checkSignatures(requestId, cleartext, proof);
        
        // Process decrypted values
        uint256[] memory results = abi.decode(cleartext, (uint256[]));
        // Results structure: [responseCount, scoreSum1, scoreSum2, ...]
        emit StatsDecrypted(requestId);
    }

    /// @notice Get list of active departments
    function getActiveDepartments() external view returns (uint256[] memory) {
        return activeDepartments;
    }
}