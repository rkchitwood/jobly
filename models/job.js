"use strict";

const db = require('../db');
const { NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** related functions for jobs */

class Job {

    /** create a job from { title, salary, equity, companyHandle } and returns { id, title, salary, equity, companyHandle} */
    static async create(data){
        const result = await db.query(
            `INSERT INTO jobs (title,
                salary,
                equity,
                company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                data.title,
                data.salary,
                data.equity,
                data.companyHandle
            ]
        );
        let job = result.rows[0];
        return job;
    }

    /** find all jobs or filter with optional searchFilters */
    static async findAll({ minSalary, hasEquity, title } = {}){
        let query = `SELECT j.id,
                            j.title,
                            j.salary,
                            j.equity,
                            j.company_handle AS "companyHandle",
                            c.name AS "companyName"
                    FROM jobs j
                        LEFT JOIN companies AS c on c.handle = j.company_handle`;
        let whereExpressions = [];
        let queryValues = [];

        //add search terms to whereExpressions and queryValues to generate SQL

        if(minSalary !== undefined){
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        if(hasEquity === true){
            whereExpressions.push(`equity > 0`);
        }

        if(title !== undefined){
            queryValues.push(`%${title}`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        query += " ORDER BY title";
        const resp = await db.query(query, queryValues);
        return resp.rows;
    }

    // return job from id

    static async get(id){
        const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`, [id]
        );
        const job = jobRes.rows[0];
        if(!job) throw new NotFoundError("no job found");
        const companyRes = await db.query(
            `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
            FROM companies
            WHERE handle=$1`, [job.companyHandle]
        );
        delete job.companyHandle;
        job.company = companyRes.rows[0];
        return job;
    }

    // partial update job with data

    static async update(id, data){
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {}
        );
        const idVarIdx = "$" + (values.length + 1);
        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${idVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];
        if(!job) throw new NotFoundError("no job found");
        return job;                          
    }

    //delete from db using id

    static async remove(id) {
        const result = await db.query(
              `DELETE
               FROM jobs
               WHERE id = $1
               RETURNING id`, [id]);
        const job = result.rows[0];    
        if (!job) throw new NotFoundError("no job found");
    }
}
    
module.exports = Job;