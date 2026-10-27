export type ActionTypeDetail = Readonly<{
  id: bigint;
  detailType: string;
  value: bigint;
  targetMood?: number;
  paramValues?: readonly bigint[];
}>;
