import { api, Callback, EthAsset } from '@interfaces/index';
import { getBalanceByPaymentTokenAddress } from '@utils/index';
import { getPriceString } from '@utils/getPriceString';
import { useWeb3React } from '@web3-react/core';
import { BigNumber, ethers, Signature } from 'ethers';
import { get } from 'lodash';
import { useCallback } from 'react';
import Web3 from 'web3';
import { EIP_712_ORDER_TYPE } from '@interfaces/constants/ether';
import { AuthProvider, ChainNetwork, OreId, PopupPluginSignParams } from "oreid-js";
import { WebPopup } from "oreid-webpopup";
import { OreidProvider } from "oreid-react";
import { toRpcSig, bufferToBigInt } from '@ethereumjs/util'
import { Buffer } from 'buffer'
import * as BN from 'bn.js'

declare let window: any;

type Return = {
  signBuyAsset: (asset: any, callback: Callback) => void;
  signCreateSale: (
    asset: EthAsset,
    price: string,
    callback: Callback,
    paymentTokenAddress?: string,
    expirationTime?: number
  ) => void;
  signCancelSale: (asset: EthAsset, callback: Callback) => void;
};

const calculatePrices = (listing_price) => {
  try {
    const opensea_fee = (listing_price * 0.025).toFixed(18)
    const royalty_fee = (listing_price / (1/(10 / 100 / 100))).toFixed(18) // 100 cause percent comes in *100
    const listing_profit = ethers.utils.parseEther(String((+listing_price - +opensea_fee - +royalty_fee).toFixed(18)))
    return {
      listing_profit: listing_profit.toString(),
      royalty_fee: ethers.utils.parseEther(String(royalty_fee)).toString(),
      opensea_fee: ethers.utils.parseEther(String(opensea_fee)).toString()
    }
  }
  catch (error) {
      alert("Error: Listing Price")
      console.log(error)
      return -1
  }
}

export const useETHContract = (): Return => {
  const { account, library } = useWeb3React();

  let ethereum = null;
  let Web3Client = null;

  if (typeof window !== 'undefined') {
    ethereum = window.ethereum;
    Web3Client = new Web3(ethereum);
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  const _getSigner = (accountAddress: string) => {
    return provider.getSigner(accountAddress);
  }

  let decodeBase64 = function(s) {
    var e={},i,b=0,c,x,l=0,a,r='',w=String.fromCharCode,L=s.length;
    var A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for(i=0;i<64;i++){e[A.charAt(i)]=i;}
    for(x=0;x<L;x++){
        c=e[s.charAt(x)];b=(b<<6)+c;l+=6;
        while(l>=8){((a=(b>>>(l-=8))&0xff)||(x<(L-2)))&&(r+=w(a));}
    }
    return r;
};

let byteArrayToHexString =function toHexString(byteArray) {
  return '0x'+Array.from(byteArray, function(byte: any) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

let longToByteArray = function(/*long*/long) {
  // we want to represent the input as a 8-bytes array
  var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

  for ( var index = 0; index < byteArray.length; index ++ ) {
      var byte = long & 0xff;
      byteArray [ index ] = byte;
      long = (long - byte) / 256 ;
  }

  return byteArray;
};


  const signOrder = async (orderParameters, accountAddress) => {

    let oreId : OreId 
    oreId = new OreId({ 
      isUsingProxyServer: false, 
      appId: 't_b08a78e045e34a0482821cb1346dbcba',
      plugins:{popup: WebPopup()}
    });
    await oreId.init()

    await oreId.popup.auth({ provider: AuthProvider.Google})

    try {
      const userChainAccounts = oreId.auth.user.data.chainAccounts;
      const ethAccount = userChainAccounts.find(ca => ca.chainNetwork === 'eth_goerli')
    
      const transactionBody = {
        from: ethAccount?.chainAccount!,
        to: "0x60d5DA4FC785Dd1dA9c2dAF084B2D5ba478c8f8b",
        value: "0x02",
        gasPrice: "0x1A4A6",
        gasLimit: "0x6274"
      }

      const transaction = await oreId.createTransaction({
        transaction: transactionBody,
        chainAccount: ethAccount?.chainAccount,
        chainNetwork: ethAccount?.chainNetwork!,

        signOptions: {
          broadcast: false,
          signatureOnly: true,
          returnSignedTransaction: true
        }
      })
      console.log(`About to sign the following transaciton object:`, transaction)
      const webWidgetSignResult = await oreId.popup.sign({ transaction })
      console.log('The signed transaction object returned from oreid:', webWidgetSignResult)
    

    } catch (error) {
      console.error(error)
    }

    // Return dummy signature for now
    return ethers.utils.splitSignature('0x514da5a6ac5ef41487f176201119a2b61bff4c652bbb3280b047c5570f6b917e3b90eea5978b94be09f77f741f1e0fde44516c1a151ee7f8a7e568f2950a91751c').compact;
  }


  const _signOrder = async (orderParameters, accountAddress) => {
    console.log('inside sign order')
    // let oreId : OreId 
    // oreId = new OreId({ 
    //   isUsingProxyServer: false, 
    //   appId: 't_b08a78e045e34a0482821cb1346dbcba',
    //   plugins:{popup: WebPopup()}
    // });
    // await oreId.init()

    // oreId.popup.auth({ provider: AuthProvider.Google}).then(async (response) => {
    //   console.log(response)

    //   const userChainAccounts = oreId.auth.user.data.chainAccounts;
    //   const ethAccount = userChainAccounts.find(ca => ca.chainNetwork === 'eth_goerli')
    
    //   const transactionBody = {
    //     from: ethAccount?.chainAccount!,
    //     to: "0x60d5DA4FC785Dd1dA9c2dAF084B2D5ba478c8f8b",
    //     value: "0x02",
    //     gasPrice: "0x1A4A6",
    //     gasLimit: "0x6274"
    //   }
    //   // var x : TransactionSignOptions = ''
    //   try {
    //     const transaction = await oreId.createTransaction({
    //       transaction: transactionBody,
    //       chainAccount: ethAccount?.chainAccount,
    //       chainNetwork: ethAccount?.chainNetwork!,

    //       signOptions: {
    //         broadcast: false,
    //         signatureOnly: true,
    //         returnSignedTransaction: true
    //       }
    //     })
    //     console.log(`About to sign the following transaciton object:`, transaction)
    //     const webWidgetSignResult = await oreId.popup.sign({ transaction })
    //     console.log('The signed transaction object returned from oreid:', webWidgetSignResult)
    //     // console.log('The signature:', webWidgetSignResult.signatures[0])

        
    //     var signedTransaction = webWidgetSignResult.signedTransaction
    //     console.log('s:', signedTransaction)
    //     var decodedString = decodeBase64(signedTransaction);
    //     console.log(decodedString);
        
    //     var transactionObj = JSON.parse(decodedString)
    //     var signatureStr = transactionObj["signatures"][0]
    //     var signatureObj = JSON.parse(signatureStr)

    //     var r = signatureObj["r"]["data"]
    //     var s = signatureObj["s"]["data"]
    //     var v = signatureObj["v"]
        
    //     console.log('sig0:', signatureObj)
    //     console.log('r:', r)
    //     console.log('s:', s)
    //     console.log('v:', v)

    //     var rStr = byteArrayToHexString(r)
    //     var sStr = byteArrayToHexString(s)
    //     var vStr = byteArrayToHexString([v])
    //     console.log('rStr:', rStr)
    //     console.log('sStr:', sStr)
    //     console.log('vStr:', vStr)

    //     var rBuffer = Buffer.from(r)
    //     var sBuffer = Buffer.from(s)
    //     var vBuffer = Buffer.allocUnsafe(v)
    //     var vBigInt = bufferToBigInt(vBuffer)
    //     console.log('vBuffer', vBuffer)
    //     console.log('vBigInt', vBigInt)
    //     var sss = toRpcSig(vBigInt, rBuffer, sBuffer)

    //     console.log('sss',sss)

    //     // return sss
    //     //return ethers.utils.splitSignature(sss).compact;

    //     console.log('after return')

    //   } catch (error) {
    //     console.error(error)
    //   }

    try {
      console.log('after return xx')

        let oreId : OreId 
        oreId = new OreId({ 
          isUsingProxyServer: false, 
          appId: 't_b08a78e045e34a0482821cb1346dbcba',
          plugins:{popup: WebPopup()}
        });
        await oreId.init()

        await oreId.popup.auth({ provider: AuthProvider.Google}).then(async (response) => {
            console.log('insode auth')

            const userChainAccounts = oreId.auth.user.data.chainAccounts;
            const ethAccount = userChainAccounts.find(ca => ca.chainNetwork === 'eth_goerli')
          
            const transactionBody = {
              from: ethAccount?.chainAccount!,
              to: "0x60d5DA4FC785Dd1dA9c2dAF084B2D5ba478c8f8b",
              value: "0x02",
              gasPrice: "0x1A4A6",
              gasLimit: "0x6274"
            }
            // var x : TransactionSignOptions = ''

              const transaction = await oreId.createTransaction({
                transaction: transactionBody,
                chainAccount: ethAccount?.chainAccount,
                chainNetwork: ethAccount?.chainNetwork!,

                signOptions: {
                  broadcast: false,
                  signatureOnly: true,
                  returnSignedTransaction: true
                }
              })

              console.log(`About to sign the following transaciton object:`, transaction)
              const webWidgetSignResult = await oreId.popup.sign({ transaction })
              console.log('The signed transaction object returned from oreid:', webWidgetSignResult)
              // console.log('The signature:', webWidgetSignResult.signatures[0])

              var signedTransaction = webWidgetSignResult.signedTransaction
              console.log('s:', signedTransaction)
              var decodedString = decodeBase64(signedTransaction);
              console.log(decodedString);
              
              var transactionObj = JSON.parse(decodedString)
              var signatureStr = transactionObj["signatures"][0]
              var signatureObj = JSON.parse(signatureStr)

              var r = signatureObj["r"]["data"]
              var s = signatureObj["s"]["data"]
              var v = signatureObj["v"]
              
              console.log('sig0:', signatureObj)
              console.log('r:', r)
              console.log('s:', s)
              console.log('v:', v)

              var rStr = byteArrayToHexString(r)
              var sStr = byteArrayToHexString(s)
              var vStr = byteArrayToHexString([v])
              console.log('rStr:', rStr)
              console.log('sStr:', sStr)
              console.log('vStr:', vStr)

              var rBuffer = Buffer.from(r)
              var sBuffer = Buffer.from(s)
              var vBuffer = Buffer.allocUnsafe(v)
              var vBigInt = bufferToBigInt(vBuffer) // This value is currently wrong
              console.log('vBuffer', vBuffer)
              console.log('vBigInt', vBigInt)
              var sss = toRpcSig(vBigInt, rBuffer, sBuffer)

              console.log('sss',sss)

              
        })

        

      





      const signer = _getSigner(accountAddress);

      console.log('signer',signer)
      const { chainId } = await provider.getNetwork();
  
      const domainData = {
        name: "Seaport",
        version: "1.1",
        chainId,
        verifyingContract: "0x00000000006c3852cbef3e08e8df289169ede581"
      };
  
      const orderComponents = {...orderParameters, counter: 0};
  
      const signature = await signer._signTypedData(
        domainData,
        EIP_712_ORDER_TYPE,
        orderComponents
      );

      console.log('signature from web3',signature)
      console.log('signature compact',ethers.utils.splitSignature(signature).compact)

      return ethers.utils.splitSignature(signature).compact;
    } catch (error) {
      
    }

    


    // }).catch((error) => {
    //   console.error(error)
    // })


  }

  const signBuyAsset = useCallback(
    async (asset: any, callback: Callback) => {
      const order = asset.sell_orders[0] ||  asset.sell_orders;
      const paymentTokenAddress = get(order.payment_token_contract, 'address');

      const balance = await getBalanceByPaymentTokenAddress(account, paymentTokenAddress);
      const priceNft = getPriceString({
        amount: +asset.listing_price,
        precision: +asset.token_precision
      });
      if (balance < Number(priceNft)) {
        // addMessage('Lack of balance', 'warning');
      } else {
        await api.buyAsset({
          account_address: account,
          asset_contract_address: asset.asset_contract.address,
          token_id: asset.token_id,
          provider: Web3Client?.currentProvider,
          callback
        });
      }
    },
    [account, Web3Client?.currentProvider]
  );

  const signCreateSale = useCallback(
    async (
      asset: EthAsset,
      price: string,
      callback: Callback,
      paymentTokenAddress?: string,
      expirationTime?: number
    ) => {
      const salt = ethers.utils.solidityKeccak256(
        ['string'],
        [`${Date.now().toString()}${account}`],
      );
      const prices = calculatePrices(price);
      if (prices === -1) return;
      const parameters = {
        offerer: account,
        zone: "0x0000000000000000000000000000000000000000",
        zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        startTime: Math.floor(new Date().getTime() / 1000),
        endTime: 1671369317,
        orderType: 0,
        offer: [
          {
            itemType: 2,
            token: asset?.asset_contract?.address,
            identifierOrCriteria: asset?.token_id,
            startAmount: '1',
            endAmount: '1'
          }
        ],
        consideration: [
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: prices.listing_profit,
            endAmount: prices.listing_profit,
            recipient: account,
          },
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: prices.opensea_fee,
            endAmount: prices.opensea_fee,
            recipient: '0x0000a26b00c1F0DF003000390027140000fAa719',
          }
        ],
        totalOriginalConsiderationItems: 2,
        salt: salt,
        conduitKey: '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
        nonce: 0,
        counter: 0,
      };
      console.log('before sign order')
      const signature = await signOrder(parameters, account)

      fetch(`https://testnets-api.opensea.io/v2/orders/goerli/seaport/listings`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters,
          signature: signature // TODO: should be `signature` from oreID app
        }),
      }).then((response) => {
        return response.json();
      }).then((res) => {
        console.log('create listing successfully', res)
        callback();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, Web3Client?.currentProvider]
  );

  const signCancelSale = useCallback(
    async (asset: EthAsset, callback: Callback) => {
      try {
        await api.removeListingAsset({
          account_address: account,
          asset_contract_address: asset.asset_contract.address,
          token_id: asset.token_id,
          provider: Web3Client?.currentProvider,
          callback
        });
      } catch (error) {
        throw error;
      }
    },
    [account, Web3Client?.currentProvider]
  );

  return {
    signBuyAsset,
    signCreateSale,
    signCancelSale,
  };
};
