import { JobDetail } from "../../../components/JobDetail";
import { fetchJob, fetchJobLogs } from "../../../lib/api";

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps): Promise<JSX.Element> {
  const [job, logs] = await Promise.all([fetchJob(params.id), fetchJobLogs(params.id)]);

  return <JobDetail job={job} logs={logs} />;
}
