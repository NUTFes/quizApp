import { useEffect, useState } from "react";

type UseRemainingTimeProps = {
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
};
