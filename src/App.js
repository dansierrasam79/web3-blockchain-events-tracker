import './App.css';
import React, {useState,useEffect,useCallback} from "react";
import { ContractABI, ContractAddress } from "./utils/contractdeets";
import Header from "./components/Header";
import Header2 from "./components/Header2";
import Logo from "./components/Logo";
import Button from "./components/Button";
const ethers = require("ethers");
const CHAIN_ID = 80001;
const NETWORK_NAME = "Mumbai";

const getChainID = async (provider) => {
  const { chainId } = await provider.getNetwork();
  if (chainId !== CHAIN_ID) {
    throw new Error(`Please switch to the ${NETWORK_NAME} network`);
  }
};

function App() {
  const [walletAddress, setwalletAddress] = useState(null);
  const [myData, setMyData] = useState(null);
  const [myNumber, setMyNumber] = useState("");
  const [myOldNumber, setMyOldNumber] = useState();
  const [myNewNumber, setMyNewNumber] = useState();
  const [myAddedNumber, setMyAddedNumber] = useState();
  const [mySender, setMyNewSender] = useState(null);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const getEthereumContract = async () => {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
        await getChainID(provider);
        const signer = provider.getSigner();
        const transactionContract = new ethers.Contract(
          ContractAddress,
          ContractABI,
          signer
        );
        return transactionContract;
      }
    throw new Error("Please install MetaMask");
  };

  const latestEvent = useCallback(async () => {
    const { ethereum } = window;
    if (!ethereum) {
      return undefined;
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    await getChainID(provider);
    const transactionContract = new ethers.Contract(ContractAddress, ContractABI, provider);
    transactionContract.on("storedNumber",(oldNumber, newNumber, addedNumber, sender) => {
    setMyOldNumber(oldNumber.toString());
    setMyNewNumber(newNumber.toString());
    setMyAddedNumber(addedNumber.toString());
    setMyNewSender(sender);
    });
    return () => transactionContract.removeAllListeners("storedNumber");
  }, []);

  const storeNum = async () => {
    if (!/^\d+$/.test(myNumber.trim())) {
      setStatus("Enter a whole number before storing it.");
      return;
    }

    try {
        setIsBusy(true);
        setStatus("Waiting for transaction confirmation...");
        const transactionContract = await getEthereumContract();
        const val = await transactionContract.store(myNumber);
        await val.wait();
        setStatus("Transaction confirmed.");
      } catch (error) {
      setStatus(error.message || "The transaction could not be completed.");
    } finally {
      setIsBusy(false);
    }
  };

  const getLastNum = async () => {      
      try {
          const transactionContract = await getEthereumContract();
          const val = await transactionContract.retrieve();
          setMyData(val.toString());
          setStatus("Latest number loaded.");
      } catch (error) {
        setStatus(error.message || "The latest number could not be loaded.");
      }
  };

  const ConnectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Please install metamask");
        return;
      } else {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        setwalletAddress(accounts[0] || null);
        setStatus(accounts[0] ? "Wallet connected." : "No wallet account selected.");
      }
    } catch (error) {
      setStatus(error.message || "Wallet connection failed.");
    }
  };

  useEffect(() => {
    const { ethereum } = window;
    if (!ethereum) {
      return undefined;
    }

    ethereum.request({ method: "eth_accounts" })
      .then((accounts) => setwalletAddress(accounts[0] || null))
      .catch(() => setwalletAddress(null));

    const handleAccountsChanged = (accounts) => {
      setwalletAddress(accounts[0] || null);
      setMyData(null);
      setMyNewSender(null);
    };
    const handleChainChanged = () => window.location.reload();

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let removeEventListener;
    latestEvent()
      .then((cleanup) => {
        if (disposed) {
          cleanup?.();
        } else {
          removeEventListener = cleanup;
        }
      })
      .catch((error) => setStatus(error.message));

    return () => {
      disposed = true;
      removeEventListener?.();
    };
  }, [latestEvent]);

  return (
      <div className="App">
          <header className = "center">
          <Logo />
          <Header title = "Blockchain Events Tracker" />
          <section className = "right">
          {walletAddress === null ? (<button onClick={ConnectWallet}> Metamask Connect Wallet </button>)
          : (<p> Wallet Address Connected </p>)}
          </section>
          <input type = "number" min = "0" step = "1" value = {myNumber} placeholder = "Enter a number" onChange={(e)=>(setMyNumber(e.target.value))} />
          <Button onClick={storeNum} text = {isBusy ? "Storing..." : "Store Number"} disabled = {isBusy} />
          <br />
          <br />
          <Button onClick = {() => getLastNum()} text = "Get Last Number" />
          {myData!==null ? <p> <b>Your Last Number: </b> {myData} </p> : undefined}
          <br />
          <Header2 title = "Latest Event"/>
          {mySender!==null ? <p><b>Old Number: </b> {myOldNumber} </p>:undefined}
          {mySender!==null ? <p><b>New Number: </b> {myNewNumber} </p>:undefined}
          {mySender!==null ? <p> <b>Added Number: </b> {myAddedNumber} </p>:undefined}
          {mySender!==null ? <p><b>Sender: </b> {mySender} </p>:undefined}
          {status ? <p role="status">{status}</p> : undefined}
          </header>
      </div>
    );
  }

export default App;