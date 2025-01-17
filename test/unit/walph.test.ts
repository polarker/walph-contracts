import {
  web3,
  Project,
  TestContractParams,
  addressFromContractId,
  AssetOutput,
  DUST_AMOUNT,
  addressFromPublicKey,
  ZERO_ADDRESS,
  ContractState,
  NamedVals,
  sleep,
} from "@alephium/web3";
import { PrivateKeyWallet } from "@alephium/web3-wallet";
import {
  expectAssertionError,
  randomContractId,
  testAddress,
  testPrivateKey,
} from "@alephium/web3-test";
import { Walph, WalphTypes } from "../../artifacts/ts";

describe("unit tests", () => {
  let testContractId: string;
  let testTokenId: string;
  let testContractAddress: string;
  let testParamsFixture: TestContractParams<
    WalphTypes.Fields,
    { amount: bigint }
  >;

  // We initialize the fixture variables before all tests
  beforeAll(async () => {
    web3.setCurrentNodeProvider("http://127.0.0.1:22973", undefined, fetch);
    await Project.build();
    testContractId = randomContractId();

    testTokenId = testContractId;
    testContractAddress = addressFromContractId(testContractId);
    testParamsFixture = {
      // a random address that the test contract resides in the tests
      address: testContractAddress,

      // initial state of the test contract
      initialFields: {
        poolSize: 10n * 10n ** 18n,
        poolOwner: testAddress,
        poolFees: 1n,
        minTokenAmountToHold: 1n,
        ticketPrice: 10n ** 18n,
        tokenIdToHold:
          "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
        open: false,
        balance: 0n,
        feesBalance: 0n,
        numAttendees: 0n,
        attendees: Array(10).fill(
          ZERO_ADDRESS
        ) as WalphTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS,
      },
      initialAsset: {
        alphAmount: 1n * 10n ** 18n,
      },
      // arguments to test the target function of the test contract
      testArgs: {
        amount: 1n * 10n ** 18n,
      },
      // assets owned by the caller of the function
      inputAssets: [
        {
          address: testAddress,
          asset: {
            alphAmount: 100n * 10n ** 18n,
            tokens: [
              {
                id: "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
                amount: 2n,
              },
            ],
          },
        },
      ],
    };
  });

  it("test try random", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.numAttendees = 10
    let runs = [0n,0n]

    // open the pool
    let testResult = await Walph.tests.random(testParams);
    runs[0] = testResult.returns
    sleep(1000)
    testResult = await Walph.tests.random(testParams);

    runs[1] = testResult.returns
    console.log(runs)

    expect(runs[0]).not.toEqual(runs[1])

  })

  it("test opening and closing pool", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));

    // open the pool
    let testResult = await Walph.tests.openPool(testParams);
    let contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.address).toEqual(testContractAddress);
    expect(contractState.fields.open).toEqual(true);

    //assign new state to initial fields and close the pool
    testParams.initialFields = contractState.fields;
    testResult = await Walph.tests.closePool(testParams);

    contractState = testResult.contracts[0] as WalphTypes.State;
    expect(contractState.fields.open).toEqual(false);
  });

  it("test try to open an opened pool", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;

    await expectAssertionError(
      Walph.tests.openPool(testParams),
      testContractAddress,
      2
    );
  });

  it("test try to close a closed pool", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = false;

    await expectAssertionError(
      Walph.tests.closePool(testParams),
      testContractAddress,
      1
    );
  });

  it("test try to open the pool with wrong address", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    const wrongAddress = PrivateKeyWallet.Random(
      0,
      web3.getCurrentNodeProvider()
    ).account.address;
    testParams.inputAssets[0].address = wrongAddress;
    testParams.initialFields.open = false;

    await expectAssertionError(
      Walph.tests.openPool(testParams),
      testContractAddress,
      4
    );
  });

  it("test buy a ticket", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"

    const testResult = await Walph.tests.buyTicket(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.balance).toEqual(10n ** 18n);
    expect(contractState.fields.feesBalance).toEqual(10n ** 16n)
    expect(contractState.fields.attendees.length).toEqual(10);
    expect(contractState.fields.numAttendees).toEqual(1n);
    expect(contractState.fields.attendees).toEqual([
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS, 
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
    ]);
  });


  it("test buy 5 tickets", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"
    testParams.testArgs.amount = 5n * 10n ** 18n
    const testResult = await Walph.tests.buyTicket(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.balance).toEqual(5n * 10n ** 18n);
    expect(contractState.fields.feesBalance).toEqual(5n * 10n ** 16n)
    expect(contractState.fields.attendees.length).toEqual(10);
    expect(contractState.fields.numAttendees).toEqual(5n);
    expect(contractState.fields.attendees).toEqual([
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
    ]);
  });


  it("test buy 3 tickets after 5 was bought", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.initialFields.balance = 5n * 10n ** 18n;
    testParams.initialFields.numAttendees = 5n;
    testParams.initialFields.feesBalance = 5n * 10n ** 16n

    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"
    testParams.testArgs.amount = 3n * 10n ** 18n
    const testResult = await Walph.tests.buyTicket(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.balance).toEqual(8n * 10n ** 18n);
    expect(contractState.fields.feesBalance).toEqual(8n * 10n ** 16n);
    expect(contractState.fields.attendees.length).toEqual(10);
    expect(contractState.fields.numAttendees).toEqual(8n);
    expect(contractState.fields.attendees).toEqual([
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
      ZERO_ADDRESS,
      ZERO_ADDRESS,
    ]);
  });



  it("test buy a ticket more than 1 ALPH", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"

    testParams.testArgs.amount = 11n * 10n ** 17n;

    await expectAssertionError(
      Walph.tests.buyTicket(testParams),
      testContractAddress,
      7
    );
  });


  it("test buy a ticket less than ticket price", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.initialFields.ticketPrice = 10n * 10n ** 18n
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"

    testParams.testArgs.amount = 9n * 10n ** 18n;

    await expectAssertionError(
      Walph.tests.buyTicket(testParams),
      testContractAddress,
      7
    );
  });


  it("test buy a ticket without holding token", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"
    testParams.inputAssets[0].asset.tokens[0].amount = 0n
    testParams.testArgs.amount = 1n * 10n ** 18n;

    await expectAssertionError(
      Walph.tests.buyTicket(testParams),
      testContractAddress,
      5
    );
  });


  it("test buy a ticket when pool full", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.initialFields.balance = 100n * 10n ** 18n;
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"

    await expectAssertionError(
      Walph.tests.buyTicket(testParams),
      testContractAddress,
      0
    );
  });

  it("test distribute prize pool", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true;
    testParams.initialFields.balance =  0;
    testParams.initialAsset.alphAmount = 100 * 10 ** 18;
    //testParams.initialFields.numAttendees = 10
    testParams.inputAssets[0].address = "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y"
    testParams.testArgs.amount = 10 * 10 ** 18


    const testResult = await Walph.tests.buyTicket(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.balance).toEqual(0n);
    expect(contractState.fields.open).toEqual(true);
    expect(contractState.fields.numAttendees).toEqual(0n);
    expect(contractState.fields.attendees.length).toEqual(10);
    expect(contractState.fields.lastWinner).toEqual("1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y");
  });


  it("test withdraw fees", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = true
    testParams.initialFields.balance =  0
    testParams.initialAsset.alphAmount = 100 * 10 ** 18
    testParams.initialFields.feesBalance = 1 * 10 ** 18

    const testResult = await Walph.tests.withdraw(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.feesBalance).toEqual(0n);

  });



  it("test change token amount to hodl", async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture));
    testParams.initialFields.open = false;
    testParams.initialFields.balance = testParams.initialFields.poolSize;
    testParams.initialAsset.alphAmount = testParams.initialFields.poolSize + 1;
    
    testParams.testArgs.newAmount = 10n
    const testResult = await Walph.tests.changeMinAmountToHold(testParams);
    const contractState = testResult.contracts[0] as WalphTypes.State;

    expect(contractState.fields.minTokenAmountToHold).toEqual(10n);
  });
});
