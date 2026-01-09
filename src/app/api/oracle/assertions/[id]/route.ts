import { getAssertion, getDisputeByAssertionId } from "@/server/oracleStore";
import { readOracleConfig } from "@/server/oracleConfig";
import { error, handleApi } from "@/server/apiResponse";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    const assertion = await getAssertion(id);
    if (!assertion) return error("not_found", 404);
    
    const dispute = await getDisputeByAssertionId(id);
    const config = await readOracleConfig();
    return { assertion, dispute, config };
  });
}
