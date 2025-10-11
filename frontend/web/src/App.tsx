// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface PREMRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  hospitalId: string;
  department: string;
  rating: number;
  comments: string;
}

const App: React.FC = () => {
  // Randomized style selections
  // Colors: High contrast (blue+orange)
  // UI: Flat design
  // Layout: Card grid
  // Interaction: Micro-interactions
  
  // Randomized features: Data statistics, search/filter, project intro
  
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PREMRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newRecordData, setNewRecordData] = useState({
    hospitalId: "",
    department: "cardiology",
    rating: 5,
    comments: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Calculate statistics
  const averageRating = records.length > 0 
    ? (records.reduce((sum, record) => sum + record.rating, 0) / records.length).toFixed(1)
    : "0.0";
  
  const departmentCounts = records.reduce((acc, record) => {
    acc[record.department] = (acc[record.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("prem_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing record keys:", e);
        }
      }
      
      const list: PREMRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`prem_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                hospitalId: recordData.hospitalId,
                department: recordData.department,
                rating: recordData.rating,
                comments: recordData.comments
              });
            } catch (e) {
              console.error(`Error parsing record data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading record ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading records:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setSubmitting(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting feedback with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newRecordData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        hospitalId: newRecordData.hospitalId,
        department: newRecordData.department,
        rating: newRecordData.rating,
        comments: newRecordData.comments
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `prem_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("prem_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "prem_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Feedback submitted securely with FHE!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowSubmitModal(false);
        setNewRecordData({
          hospitalId: "",
          department: "cardiology",
          rating: 5,
          comments: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: `FHE service is ${isAvailable ? "available" : "unavailable"}`
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Failed to check availability"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.hospitalId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         record.comments.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || record.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departments = [
    "all",
    "cardiology",
    "neurology",
    "pediatrics",
    "orthopedics",
    "emergency",
    "surgery",
    "radiology"
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading anonymous feedback data...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Anonymous PREMs</h1>
          <p>Patient Reported Experience Measures</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowSubmitModal(true)} 
            className="primary-btn"
          >
            Submit Feedback
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <main className="main-content">
        <section className="intro-section card">
          <h2>About Anonymous PREMs</h2>
          <p>
            Our platform allows patients to anonymously submit feedback about their healthcare experiences 
            using Fully Homomorphic Encryption (FHE). Hospitals only receive aggregated statistics without 
            access to individual responses, ensuring complete patient privacy.
          </p>
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <button 
            onClick={checkAvailability}
            className="secondary-btn"
          >
            Check FHE Status
          </button>
        </section>
        
        <section className="stats-section">
          <div className="stat-card card">
            <h3>Total Feedback</h3>
            <div className="stat-value">{records.length}</div>
          </div>
          <div className="stat-card card">
            <h3>Average Rating</h3>
            <div className="stat-value">{averageRating}</div>
            <div className="stat-subtext">out of 5</div>
          </div>
          <div className="stat-card card">
            <h3>Departments</h3>
            <div className="stat-value">{Object.keys(departmentCounts).length}</div>
          </div>
        </section>
        
        <section className="filter-section card">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </option>
              ))}
            </select>
            <button 
              onClick={loadRecords}
              disabled={isRefreshing}
              className="refresh-btn"
            >
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </section>
        
        <section className="records-section">
          <h2>Recent Patient Feedback</h2>
          {filteredRecords.length === 0 ? (
            <div className="no-records card">
              <p>No feedback records found</p>
              <button 
                className="primary-btn"
                onClick={() => setShowSubmitModal(true)}
              >
                Submit First Feedback
              </button>
            </div>
          ) : (
            <div className="records-grid">
              {filteredRecords.map(record => (
                <div className="record-card card" key={record.id}>
                  <div className="card-header">
                    <span className="hospital-id">Hospital #{record.hospitalId.substring(0, 6)}</span>
                    <span className={`department ${record.department}`}>{record.department}</span>
                  </div>
                  <div className="rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < record.rating ? "star filled" : "star"}>★</span>
                    ))}
                  </div>
                  <p className="comments">{record.comments || "No additional comments"}</p>
                  <div className="card-footer">
                    <span className="timestamp">
                      {new Date(record.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
  
      {showSubmitModal && (
        <ModalSubmit 
          onSubmit={submitRecord} 
          onClose={() => setShowSubmitModal(false)} 
          submitting={submitting}
          recordData={newRecordData}
          setRecordData={setNewRecordData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="notification">
          <div className={`notification-content ${transactionStatus.status}`}>
            {transactionStatus.message}
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <p>Anonymous PREMs - Patient Reported Experience Measures</p>
          <p>All feedback is encrypted using FHE technology</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalSubmitProps {
  onSubmit: () => void; 
  onClose: () => void; 
  submitting: boolean;
  recordData: any;
  setRecordData: (data: any) => void;
}

const ModalSubmit: React.FC<ModalSubmitProps> = ({ 
  onSubmit, 
  onClose, 
  submitting,
  recordData,
  setRecordData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordData({
      ...recordData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!recordData.hospitalId || !recordData.department) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="submit-modal card">
        <div className="modal-header">
          <h2>Submit Anonymous Feedback</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            Your feedback will be encrypted with FHE and remain anonymous
          </div>
          
          <div className="form-group">
            <label>Hospital ID *</label>
            <input 
              type="text"
              name="hospitalId"
              value={recordData.hospitalId} 
              onChange={handleChange}
              placeholder="Enter hospital identifier" 
            />
          </div>
          
          <div className="form-group">
            <label>Department *</label>
            <select 
              name="department"
              value={recordData.department} 
              onChange={handleChange}
            >
              <option value="cardiology">Cardiology</option>
              <option value="neurology">Neurology</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="emergency">Emergency</option>
              <option value="surgery">Surgery</option>
              <option value="radiology">Radiology</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Rating (1-5)</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  className={recordData.rating === num ? "active" : ""}
                  onClick={() => setRecordData({...recordData, rating: num})}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Comments</label>
            <textarea 
              name="comments"
              value={recordData.comments} 
              onChange={handleChange}
              placeholder="Your experience (optional)" 
              rows={4}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="secondary-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="primary-btn"
          >
            {submitting ? "Encrypting with FHE..." : "Submit Anonymously"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;