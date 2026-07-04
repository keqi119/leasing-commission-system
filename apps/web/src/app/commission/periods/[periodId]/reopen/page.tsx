type PageProps = {
  params: Promise<{ periodId: string }>;
};

export default async function PeriodReopenPage({ params }: PageProps) {
  const { periodId } = await params;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Period Reopen</h1>
          <p className="page-subtitle">
            Reopen is controlled. The old approved run and export records stay bound to their original runId.
          </p>
        </div>
        <span className="badge amber">boss / admin</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Reopen Flow</h2>
          <span className="badge blue">{periodId}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Request API</th><td>POST /api/commission/periods/{periodId}/reopen-requests</td></tr>
              <tr><th>Approve API</th><td>PATCH /api/commission/periods/{periodId}/reopen-requests/:requestId/approve</td></tr>
              <tr><th>Required reason</th><td>Yes</td></tr>
              <tr><th>Historical approved run</th><td>Retained and not overwritten</td></tr>
              <tr><th>Replacement result</th><td>Only a newly approved run can become the latest official result</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
